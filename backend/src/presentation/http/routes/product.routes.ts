import { Router } from 'express';
import { ProductController } from '@presentation/http/controllers/product.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { productValidators } from '@presentation/validators/product.validator';

const router = Router();
const productController = new ProductController();

// Todas as rotas exigem autenticação
router.use(authenticate);

// ========================================
// ROTAS DE PRODUTOS
// ========================================

/**
 * GET /products/low-stock
 * Obter produtos com estoque baixo
 * Acesso: admin, manager
 */
router.get(
  '/products/low-stock',
  authorize(['admin', 'manager']),
  productController.getLowStockProducts.bind(productController)
);

/**
 * GET /products
 * Listar/buscar produtos
 * Acesso: todos autenticados
 */
router.get(
  '/products',
  validate(productValidators.searchProducts),
  productController.searchProducts.bind(productController)
);

/**
 * GET /products/:id
 * Obter produto específico
 * Acesso: todos autenticados
 */
router.get(
  '/products/:id',
  validate(productValidators.uuidParam),
  productController.getProductById.bind(productController)
);

/**
 * POST /products
 * Criar novo produto
 * Acesso: admin, manager
 */
router.post(
  '/products',
  authorize(['admin', 'manager']),
  validate(productValidators.createProduct),
  productController.createProduct.bind(productController)
);

/**
 * PUT /products/:id
 * Atualizar produto
 * Acesso: admin, manager
 */
router.put(
  '/products/:id',
  authorize(['admin', 'manager']),
  validate(productValidators.uuidParam),
  validate(productValidators.updateProduct),
  productController.updateProduct.bind(productController)
);

/**
 * DELETE /products/:id
 * Desativar produto (soft delete)
 * Acesso: admin
 */
router.delete(
  '/products/:id',
  authorize(['admin']),
  validate(productValidators.uuidParam),
  productController.deactivateProduct.bind(productController)
);

/**
 * POST /products/:id/costs
 * Adicionar novo custo ao produto
 * Acesso: admin, manager
 */
router.post(
  '/products/:id/costs',
  authorize(['admin', 'manager']),
  validate(productValidators.uuidParam),
  validate(productValidators.addCost),
  productController.addProductCost.bind(productController)
);

/**
 * PATCH /products/:id/stock
 * Atualizar estoque do produto
 * Acesso: admin, manager
 */
router.patch(
  '/products/:id/stock',
  authorize(['admin', 'manager']),
  validate(productValidators.uuidParam),
  validate(productValidators.updateStock),
  productController.updateStock.bind(productController)
);

// ========================================
// ROTAS DE CATEGORIAS
// ========================================

/**
 * GET /categories/tree
 * Obter árvore de categorias
 * Acesso: todos autenticados
 */
router.get(
  '/categories/tree',
  productController.getCategoryTree.bind(productController)
);

/**
 * GET /categories
 * Listar todas as categorias
 * Acesso: todos autenticados
 */
router.get(
  '/categories',
  productController.getAllCategories.bind(productController)
);

/**
 * GET /categories/:id
 * Obter categoria específica
 * Acesso: todos autenticados
 */
router.get(
  '/categories/:id',
  validate(productValidators.uuidParam),
  productController.getCategoryById.bind(productController)
);

/**
 * POST /categories
 * Criar nova categoria
 * Acesso: admin, manager
 */
router.post(
  '/categories',
  authorize(['admin', 'manager']),
  validate(productValidators.createCategory),
  productController.createCategory.bind(productController)
);

/**
 * PUT /categories/:id
 * Atualizar categoria
 * Acesso: admin, manager
 */
router.put(
  '/categories/:id',
  authorize(['admin', 'manager']),
  validate(productValidators.uuidParam),
  validate(productValidators.updateCategory),
  productController.updateCategory.bind(productController)
);

/**
 * DELETE /categories/:id
 * Desativar categoria
 * Acesso: admin
 */
router.delete(
  '/categories/:id',
  authorize(['admin']),
  validate(productValidators.uuidParam),
  productController.deactivateCategory.bind(productController)
);

export default router;
