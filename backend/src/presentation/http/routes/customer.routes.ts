import { Router } from 'express';
import { CustomerController } from '@presentation/http/controllers/customer.controller';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import { validate } from '@presentation/http/middlewares/validate';
import { auditLog } from '@presentation/http/middlewares/audit-log';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
  searchCustomersSchema,
  addAddressSchema,
  addressIdSchema,
} from '@presentation/validators/customer.validator';

const router = Router();
const controller = new CustomerController();

// All routes require authentication
router.use(authenticate);

// Get all customers (list view)
router.get(
  '/',
  controller.search
);

// Search customers (fast lookup during sales)
router.get(
  '/search',
  validate(searchCustomersSchema),
  controller.search
);

// Get top customers (for dashboard)
router.get(
  '/top',
  authorize('admin', 'manager'),
  controller.getTopCustomers
);

// Get customer by ID
router.get(
  '/:id',
  validate(customerIdSchema),
  controller.findById
);

// Get customer loyalty balance
router.get(
  '/:id/loyalty',
  validate(customerIdSchema),
  controller.getLoyaltyBalance
);

// Create customer
router.post(
  '/',
  validate(createCustomerSchema),
  auditLog('customer_create'),
  controller.create
);

// Update customer
router.put(
  '/:id',
  validate(updateCustomerSchema),
  auditLog('customer_update'),
  controller.update
);

// Address management
router.post(
  '/:id/addresses',
  validate(addAddressSchema),
  auditLog('customer_address_create'),
  controller.addAddress
);

router.put(
  '/addresses/:addressId',
  validate(addressIdSchema),
  auditLog('customer_address_update'),
  controller.updateAddress
);

router.delete(
  '/addresses/:addressId',
  validate(addressIdSchema),
  auditLog('customer_address_delete'),
  controller.deleteAddress
);

export default router;
