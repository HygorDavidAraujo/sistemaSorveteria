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
    if (data.categoryId) {
      const category = await this.prismaClient.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError('Categoria não encontrada', 404);
      }
    }

    const existingCode = await this.prismaClient.product.findUnique({
      where: { code: data.code },
    });

    if (existingCode) {
      throw new AppError('Código do produto já está em uso', 400);
    }

    const product = await this.prismaClient.product.create({
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
        category: true,
      },
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
          category: true,
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
        category: true,
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

    if (data.categoryId) {
      const category = await this.prismaClient.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new AppError('Categoria não encontrada', 404);
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

    const updatedProduct = await this.prismaClient.product.update({
      where: { id },
      data,
      include: {
        category: true,
      },
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
