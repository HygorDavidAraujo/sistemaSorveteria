import { PrismaClient, Category } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
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

    const category = await this.prismaClient.category.create({
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
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

    const updatedCategory = await this.prismaClient.category.update({
      where: { id },
      data,
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
