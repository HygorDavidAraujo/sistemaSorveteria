import { PrismaClient, Category, ProductCategoryType } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export interface CategorySizeInput {
  id?: string;
  name: string;
  maxFlavors: number;
  displayOrder?: number;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  isActive?: boolean;
  categoryType?: ProductCategoryType;
  sizes?: CategorySizeInput[];
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
  categoryType?: ProductCategoryType;
  sizes?: CategorySizeInput[];
}

export class CategoryService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Criar uma nova categoria
   */
  async createCategory(data: CreateCategoryDTO): Promise<Category> {
    // Verificar se o nome já existe
    const existingCategory = await this.prismaClient.category.findFirst({
      where: {
        name: {
          equals: data.name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      throw new AppError('Já existe uma categoria com este nome', 400);
    }

    const categoryType = data.categoryType ?? 'common';

    if (categoryType === 'assembled') {
      const sizes = Array.isArray(data.sizes) ? data.sizes : [];
      if (sizes.length === 0) {
        throw new AppError('Categoria do tipo Montado exige ao menos um tamanho', 400);
      }
      for (const s of sizes) {
        if (!s.name?.trim()) throw new AppError('Nome do tamanho é obrigatório', 400);
        if (!Number.isFinite(s.maxFlavors) || s.maxFlavors < 1) {
          throw new AppError('Quantidade de sabores por tamanho deve ser >= 1', 400);
        }
      }
    }

    const category = await this.prismaClient.category.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
        categoryType,
        sizes:
          categoryType === 'assembled' && Array.isArray(data.sizes)
            ? {
                create: data.sizes.map((s, idx) => ({
                  name: s.name.trim(),
                  maxFlavors: s.maxFlavors,
                  displayOrder: s.displayOrder ?? idx,
                })),
              }
            : undefined,
      },
      include: {
        sizes: { orderBy: { displayOrder: 'asc' } },
      },
    });

    return category;
  }

  /**
   * Listar todas as categorias
   */
  async getAllCategories(includeInactive = false): Promise<Category[]> {
    const where = includeInactive ? {} : { isActive: true };

    return this.prismaClient.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        sizes: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  /**
   * Obter árvore de categorias (flat, já que não há hierarquia)
   */
  async getCategoryTree(): Promise<(Category & { _count: { products: number } })[]> {
    return this.prismaClient.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        sizes: { orderBy: { displayOrder: 'asc' } },
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Obter categoria por ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const category = await this.prismaClient.category.findUnique({
      where: { id },
      include: {
        sizes: { orderBy: { displayOrder: 'asc' } },
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            salePrice: true,
            currentStock: true,
            trackStock: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }

    return category;
  }

  /**
   * Atualizar categoria
   */
  async updateCategory(
    id: string,
    data: UpdateCategoryDTO
  ): Promise<Category> {
    const existingCategory = await this.prismaClient.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new AppError('Categoria não encontrada', 404);
    }

    // Verificar se novo nome já existe em outra categoria
    if (data.name && data.name !== existingCategory.name) {
      const duplicateName = await this.prismaClient.category.findFirst({
        where: {
          name: {
            equals: data.name,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (duplicateName) {
        throw new AppError('Já existe uma categoria com este nome', 400);
      }
    }

    const nextType = data.categoryType ?? existingCategory.categoryType;

    if (nextType === 'assembled') {
      const sizes = data.sizes;
      if (sizes) {
        if (!Array.isArray(sizes) || sizes.length === 0) {
          throw new AppError('Categoria do tipo Montado exige ao menos um tamanho', 400);
        }
        for (const s of sizes) {
          if (!s.name?.trim()) throw new AppError('Nome do tamanho é obrigatório', 400);
          if (!Number.isFinite(s.maxFlavors) || s.maxFlavors < 1) {
            throw new AppError('Quantidade de sabores por tamanho deve ser >= 1', 400);
          }
        }
      }
    }

    const normalizeName = (name: string) => name.trim().toLocaleLowerCase();

    const updatedCategory = await this.prismaClient.$transaction(async (tx) => {
      // Se o tipo foi explicitamente setado para common, removemos tamanhos (e preços por tamanho são removidos via cascade).
      const willBecomeCommon = data.categoryType === 'common';

      if (willBecomeCommon) {
        await tx.categorySize.deleteMany({ where: { categoryId: id } });
      } else if (data.sizes) {
        const incoming = data.sizes.map((s, idx) => ({
          id: s.id,
          name: s.name.trim(),
          maxFlavors: s.maxFlavors,
          displayOrder: s.displayOrder ?? idx,
        }));

        // Estratégia: atualizar/criar mantendo IDs quando possível.
        // - Se o payload vier com id, usamos id.
        // - Senão, tentamos casar por nome (case-insensitive).
        // Isso evita apagar tamanhos e perder product_size_prices em edições simples (ex: maxFlavors/ordem).
        const existingSizes = await tx.categorySize.findMany({
          where: { categoryId: id },
          select: { id: true, name: true },
        });

        const existingById = new Map(existingSizes.map((s) => [s.id, s]));
        const existingByName = new Map(existingSizes.map((s) => [normalizeName(s.name), s]));
        const keepIds = new Set<string>();

        for (const s of incoming) {
          if (!s.name) continue;

          const byId = s.id ? existingById.get(s.id) : undefined;
          const byName = existingByName.get(normalizeName(s.name));
          const target = byId ?? byName;

          if (target) {
            keepIds.add(target.id);
            await tx.categorySize.update({
              where: { id: target.id },
              data: {
                name: s.name,
                maxFlavors: s.maxFlavors,
                displayOrder: s.displayOrder,
              },
            });
          } else {
            const created = await tx.categorySize.create({
              data: {
                categoryId: id,
                name: s.name,
                maxFlavors: s.maxFlavors,
                displayOrder: s.displayOrder,
              },
              select: { id: true },
            });
            keepIds.add(created.id);
          }
        }

        // Remove tamanhos que não vieram no payload.
        // Observação: deletar um tamanho remove automaticamente os product_size_prices relacionados via FK cascade.
        if (keepIds.size === 0) {
          await tx.categorySize.deleteMany({ where: { categoryId: id } });
        } else {
          await tx.categorySize.deleteMany({
            where: {
              categoryId: id,
              id: { notIn: Array.from(keepIds) },
            },
          });
        }
      }

      return tx.category.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          isActive: data.isActive,
          categoryType: data.categoryType,
        },
        include: {
          sizes: { orderBy: { displayOrder: 'asc' } },
        },
      });
    });

    return updatedCategory;
  }

  /**
   * Desativar categoria
   */
  async deactivateCategory(id: string): Promise<Category> {
    const category = await this.prismaClient.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Categoria não encontrada', 404);
    }

    if (category.products.length > 0) {
      throw new AppError(
        'Não é possível desativar uma categoria com produtos ativos',
        400
      );
    }

    const updatedCategory = await this.prismaClient.category.update({
      where: { id },
      data: { isActive: false },
    });

    return updatedCategory;
  }
}
