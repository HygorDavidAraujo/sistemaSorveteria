import { Request, Response, NextFunction } from 'express';
import { ProductService } from '@application/use-cases/products/product.service';
import { CategoryService } from '@application/use-cases/products/category.service';

const productService = new ProductService();
const categoryService = new CategoryService();

export class ProductController {
  /**
   * POST /products - Criar produto
   */
  async createProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const product = await productService.createProduct({
        ...req.body,
        createdById: userId,
      });

      res.status(201).json({
        status: 'success',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /products - Listar produtos com filtros
   */
  async searchProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, categoryId, isActive, page, limit } = req.query;

      const result = await productService.searchProducts({
        search: search as string,
        categoryId: categoryId as string,
        isActive: isActive ? isActive === 'true' : undefined,
        saleType: req.query.saleType as 'unit' | 'weight',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        status: 'success',
        data: result.products,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /products/:id - Obter produto por ID
   */
  async getProductById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);

      res.json({
        status: 'success',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /products/:id - Atualizar produto
   */
  async updateProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(id, req.body);

      res.json({
        status: 'success',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /products/:id - Desativar produto
   */
  async deactivateProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const product = await productService.deactivateProduct(id);

      res.json({
        status: 'success',
        data: product,
        message: 'Produto desativado com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /products/:id/costs - Adicionar novo custo
   */
  async addProductCost(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { costPrice } = req.body;
      const userId = (req as any).user.userId;

      const cost = await productService.addProductCost(
        id,
        costPrice,
        userId
      );

      res.status(201).json({
        status: 'success',
        data: cost,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /products/:id/stock - Atualizar estoque
   */
  async updateStock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { quantity, operation } = req.body;

      const product = await productService.updateStock(
        id,
        quantity,
        operation
      );

      res.json({
        status: 'success',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /products/low-stock - Produtos com estoque baixo
   */
  async getLowStockProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const products = await productService.getLowStockProducts();

      res.json({
        status: 'success',
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /categories - Criar categoria
   */
  async createCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const category = await categoryService.createCategory(req.body);

      res.status(201).json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /categories - Listar categorias
   */
  async getAllCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { includeInactive } = req.query;
      const categories = await categoryService.getAllCategories(
        includeInactive === 'true'
      );

      res.json({
        status: 'success',
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /categories/tree - Árvore de categorias
   */
  async getCategoryTree(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tree = await categoryService.getCategoryTree();

      res.json({
        status: 'success',
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /categories/:id - Obter categoria por ID
   */
  async getCategoryById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const category = await categoryService.getCategoryById(id);

      res.json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /categories/:id - Atualizar categoria
   */
  async updateCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const category = await categoryService.updateCategory(id, req.body);

      res.json({
        status: 'success',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /categories/:id - Desativar categoria
   */
  async deactivateCategory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const category = await categoryService.deactivateCategory(id);

      res.json({
        status: 'success',
        data: category,
        message: 'Categoria desativada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
