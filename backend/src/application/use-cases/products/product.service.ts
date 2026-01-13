import { PrismaClient, Product, ProductCost } from '@prisma/client';
import prisma from '@infrastructure/database/prisma-client';
import { AppError } from '@shared/errors/app-error';

export interface CreateProductDTO {
  name: string;
  code: string;
  description?: string;
  categoryId?: string;
  salePrice: number;
  costPrice?: number;
  saleType: 'unit' | 'weight';
  sizePrices?: Array<{ sizeId: string; price: number }>;
  unit?: string;
  eligibleForLoyalty?: boolean;
  loyaltyPointsMultiplier?: number;
  trackStock?: boolean;
  currentStock?: number;
  minStock?: number;
  isActive?: boolean;
  createdById?: string;
}

export interface UpdateProductDTO {
  name?: string;
  code?: string;
  description?: string;
  categoryId?: string;
  salePrice?: number;
  costPrice?: number;
  saleType?: 'unit' | 'weight';
  sizePrices?: Array<{ sizeId: string; price: number }>;
  unit?: string;
  eligibleForLoyalty?: boolean;
  loyaltyPointsMultiplier?: number;
  trackStock?: boolean;
  currentStock?: number;
  minStock?: number;
  isActive?: boolean;
}

export interface SearchProductsDTO {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  saleType?: 'unit' | 'weight';
  page?: number;
  limit?: number;
}

export class ProductService {
  constructor(private prismaClient: PrismaClient = prisma) {}

  /**
   * Criar um novo produto
   */
  async createProduct(data: CreateProductDTO): Promise<Product> {
    let category: any = null;
    if (data.categoryId) {
      category = await this.prismaClient.category.findUnique({
        where: { id: data.categoryId },
        include: {
          sizes: { orderBy: { displayOrder: 'asc' } },
        },
      });

      if (!category) {
        throw new AppError('Categoria não encontrada', 404);
      }

      if (category.categoryType === 'assembled') {
        const sizePrices = Array.isArray(data.sizePrices) ? data.sizePrices : [];
        if (sizePrices.length === 0) {
          throw new AppError('Categoria do tipo Montado exige preços por tamanho', 400);
        }

        const sizeIdSet = new Set(category.sizes.map((s: any) => s.id));
        for (const sp of sizePrices) {
          if (!sizeIdSet.has(sp.sizeId)) {
            throw new AppError('Tamanho informado não pertence à categoria', 400);
          }
          if (!Number.isFinite(sp.price) || sp.price <= 0) {
            throw new AppError('Preço por tamanho deve ser maior que zero', 400);
          }
        }
      }
    }

    const existingCode = await this.prismaClient.product.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new AppError('Código do produto já está em uso', 400);
    }

    const product = await this.prismaClient.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          categoryId: data.categoryId,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          saleType: data.saleType,
          unit: data.unit,
          eligibleForLoyalty: data.eligibleForLoyalty ?? false,
          loyaltyPointsMultiplier: data.loyaltyPointsMultiplier ?? 1,
          trackStock: data.trackStock ?? false,
          currentStock: data.currentStock ?? 0,
          minStock: data.minStock ?? 0,
          isActive: data.isActive ?? true,
          createdById: data.createdById,
        },
        include: {
          category: {
            include: { sizes: { orderBy: { displayOrder: 'asc' } } },
          },
          sizePrices: true,
        },
      });

      if (category?.categoryType === 'assembled' && Array.isArray(data.sizePrices)) {
        await tx.productSizePrice.createMany({
          data: data.sizePrices.map((sp) => ({
            productId: created.id,
            categorySizeId: sp.sizeId,
            price: sp.price,
          })),
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          category: { include: { sizes: { orderBy: { displayOrder: 'asc' } } } },
          sizePrices: true,
        },
      });
    });

    if (data.costPrice !== undefined) {
      await this.prismaClient.productCost.create({
        data: {
          productId: product.id,
          costPrice: data.costPrice,
          validFrom: new Date(),
          createdById: data.createdById,
        },
      });
    }

    return product;
  }

  /**
   * Buscar produtos com filtros
   */
  async searchProducts(filters: SearchProductsDTO) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.saleType) {
      where.saleType = filters.saleType;
    }

    const [products, total] = await Promise.all([
      this.prismaClient.product.findMany({
        where,
        include: {
          category: {
            include: {
              sizes: { orderBy: { displayOrder: 'asc' } },
            },
          },
          sizePrices: {
            select: {
              categorySizeId: true,
              price: true,
            },
          },
          productCosts: {
            orderBy: { validFrom: 'desc' },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prismaClient.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obter produto por ID
   */
  async getProductById(id: string): Promise<Product> {
    const product = await this.prismaClient.product.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            sizes: { orderBy: { displayOrder: 'asc' } },
          },
        },
        sizePrices: {
          select: {
            categorySizeId: true,
            price: true,
          },
        },
        productCosts: {
          orderBy: { validFrom: 'desc' },
          take: 3,
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    return product;
  }

  /**
   * Atualizar produto
   */
  async updateProduct(id: string, data: UpdateProductDTO): Promise<Product> {
    // Verificar se produto existe
    const existingProduct = await this.prismaClient.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new AppError('Produto não encontrado', 404);
    }

    let nextCategory: any = null;
    const categoryIdToValidate = data.categoryId ?? existingProduct.categoryId;
    if (categoryIdToValidate) {
      nextCategory = await this.prismaClient.category.findUnique({
        where: { id: categoryIdToValidate },
        include: { sizes: { orderBy: { displayOrder: 'asc' } } },
      });

      if (!nextCategory) {
        throw new AppError('Categoria não encontrada', 404);
      }
    }

    if (data.sizePrices) {
      if (!nextCategory || nextCategory.categoryType !== 'assembled') {
        throw new AppError('Preços por tamanho só podem ser usados em categorias do tipo Montado', 400);
      }
      if (!Array.isArray(data.sizePrices) || data.sizePrices.length === 0) {
        throw new AppError('Informe ao menos um preço por tamanho', 400);
      }
      const sizeIdSet = new Set(nextCategory.sizes.map((s: any) => s.id));
      for (const sp of data.sizePrices) {
        if (!sizeIdSet.has(sp.sizeId)) {
          throw new AppError('Tamanho informado não pertence à categoria', 400);
        }
        if (!Number.isFinite(sp.price) || sp.price <= 0) {
          throw new AppError('Preço por tamanho deve ser maior que zero', 400);
        }
      }
    }

    if (data.code && data.code !== existingProduct.code) {
      const existingCode = await this.prismaClient.product.findUnique({
        where: { code: data.code },
      });

      if (existingCode) {
        throw new AppError('Código do produto já está em uso', 400);
      }
    }

    const updatedProduct = await this.prismaClient.$transaction(async (tx) => {
      const { sizePrices: _ignoredSizePrices, ...productData } = data as any;

      const updated = await tx.product.update({
        where: { id },
        data: productData,
      });

      if (data.sizePrices) {
        await tx.productSizePrice.deleteMany({ where: { productId: id } });
        await tx.productSizePrice.createMany({
          data: data.sizePrices.map((sp) => ({
            productId: id,
            categorySizeId: sp.sizeId,
            price: sp.price,
          })),
        });
      }

      // Se mudou para categoria comum, removemos preços por tamanho (não usados)
      if (nextCategory && nextCategory.categoryType !== 'assembled') {
        await tx.productSizePrice.deleteMany({ where: { productId: id } });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          category: { include: { sizes: { orderBy: { displayOrder: 'asc' } } } },
          sizePrices: { select: { categorySizeId: true, price: true } },
        },
      });
    });

    return updatedProduct;
  }

  /**
   * Desativar produto (soft delete)
   */
  async deactivateProduct(id: string): Promise<Product> {
    const product = await this.prismaClient.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    const updatedProduct = await this.prismaClient.product.update({
      where: { id },
      data: { isActive: false },
      include: {
        category: true,
      },
    });

    return updatedProduct;
  }

  /**
   * Adicionar novo custo ao produto
   */
  async addProductCost(
    productId: string,
    costPrice: number,
    createdById?: string
  ): Promise<ProductCost> {
    const product = await this.prismaClient.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    return this.prismaClient.productCost.create({
      data: {
        productId,
        costPrice,
        validFrom: new Date(),
        createdById,
      },
    });
  }

  /**
   * Atualizar estoque do produto
   */
  async updateStock(
    productId: string,
    quantity: number,
    operation: 'add' | 'subtract' | 'set'
  ): Promise<Product> {
    const product = await this.prismaClient.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new AppError('Produto não encontrado', 404);
    }

    let newStock: number;

    switch (operation) {
      case 'add':
        newStock = Number(product.currentStock) + quantity;
        break;
      case 'subtract':
        newStock = Number(product.currentStock) - quantity;
        if (newStock < 0) {
          throw new AppError('Estoque insuficiente', 400);
        }
        break;
      case 'set':
        newStock = quantity;
        break;
    }

    const updatedProduct = await this.prismaClient.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
      include: {
        category: true,
      },
    });

    return updatedProduct;
  }

  /**
   * Obter produtos com estoque baixo
   */
  async getLowStockProducts(): Promise<Product[]> {
    const products = await this.prismaClient.$queryRaw<Product[]>`
      SELECT * FROM products
      WHERE is_active = true AND track_stock = true AND current_stock <= min_stock
      ORDER BY current_stock ASC
    `;

    return products;
  }
}
