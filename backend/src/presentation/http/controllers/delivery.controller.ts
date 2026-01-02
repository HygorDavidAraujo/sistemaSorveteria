import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from '@application/use-cases/delivery/delivery.service';

export class DeliveryController {
  private deliveryService: DeliveryService;

  constructor() {
    this.deliveryService = new DeliveryService();
  }

  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.deliveryService.createOrder({
        ...req.body,
        createdById: req.user!.userId,
      });

      res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.deliveryService.getOrderById(id);

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        status: req.query.status as any,
        customerId: req.query.customerId as string,
        cashSessionId: req.query.cashSessionId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await this.deliveryService.listOrders(filters);

      res.json({
        status: 'success',
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const order = await this.deliveryService.updateStatus(id, req.body);

      res.json({
        success: true,
        message: 'Status atualizado com sucesso',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getCustomerOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.deliveryService.getCustomerOrders(customerId, page, limit);

      res.json({
        status: 'success',
        data: result.orders,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  // Delivery Fees

  listFees = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isActive = req.query.isActive
        ? req.query.isActive === 'true'
        : undefined;

      const fees = await this.deliveryService.listFees(isActive);

      res.json({
        status: 'success',
        data: fees,
      });
    } catch (error) {
      next(error);
    }
  };

  getFeeById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const fee = await this.deliveryService.getFeeById(id);

      res.json({
        success: true,
        data: fee,
      });
    } catch (error) {
      next(error);
    }
  };

  createFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fee = await this.deliveryService.createFee(req.body);

      res.status(201).json({
        success: true,
        message: 'Taxa criada com sucesso',
        data: fee,
      });
    } catch (error) {
      next(error);
    }
  };

  updateFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const fee = await this.deliveryService.updateFee(id, req.body);

      res.json({
        success: true,
        message: 'Taxa atualizada com sucesso',
        data: fee,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.deliveryService.deleteFee(id);

      res.json({
        success: true,
        message: 'Taxa desativada com sucesso',
      });
    } catch (error) {
      next(error);
    }
  };

  calculateFee = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { neighborhood, city, subtotal } = req.body;
      const fee = await this.deliveryService.calculateDeliveryFee(
        neighborhood,
        city,
        subtotal
      );

      res.json({
        success: true,
        data: { fee },
      });
    } catch (error) {
      next(error);
    }
  };
}
