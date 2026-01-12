import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '@application/use-cases/customers/customer.service';

const customerService = new CustomerService();

export class CustomerController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.create(req.body, req.user?.userId);

      res.locals.entityId = customer.id;
      res.locals.newValues = customer;

      res.status(201).json({
        status: 'success',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const oldCustomer = await customerService.findById(id);
      const customer = await customerService.update(id, req.body);

      res.locals.entityId = customer.id;
      res.locals.oldValues = oldCustomer;
      res.locals.newValues = customer;

      res.json({
        status: 'success',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const customer = await customerService.findById(id);

      res.json({
        status: 'success',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, isActive, limit, offset } = req.query;

      const result = await customerService.search({
        search: search as string,
        isActive: isActive === 'false' ? false : true,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        status: 'success',
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const customer = await customerService.findById(id);

      const hasAnyAddressField =
        !!customer.street ||
        !!customer.number ||
        !!customer.neighborhood ||
        !!customer.city ||
        !!customer.state ||
        !!customer.zipCode ||
        !!customer.referencePoint ||
        !!customer.complement;

      const addresses = hasAnyAddressField
        ? [
            {
              id: customer.id,
              street: customer.street,
              number: customer.number,
              complement: customer.complement,
              neighborhood: customer.neighborhood,
              city: customer.city,
              state: customer.state,
              zipCode: customer.zipCode,
              referencePoint: customer.referencePoint,
              isDefault: true,
            },
          ]
        : [];

      res.json({
        status: 'success',
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  async addAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const address = await customerService.addAddress(id, req.body);

      res.status(201).json({
        status: 'success',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { addressId } = req.params;
      const address = await customerService.updateAddress(addressId, req.body);

      res.json({
        status: 'success',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const { addressId } = req.params;
      await customerService.deleteAddress(addressId);

      res.json({
        status: 'success',
        message: 'Endereço removido com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }

  async getTopCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const customers = await customerService.getTopCustomers(
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        status: 'success',
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLoyaltyBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const loyalty = await customerService.getLoyaltyBalance(id);

      res.json({
        status: 'success',
        data: loyalty,
      });
    } catch (error) {
      next(error);
    }
  }
}
