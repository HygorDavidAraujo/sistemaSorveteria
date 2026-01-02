import prisma from '@infrastructure/database/prisma-client';
import { NotFoundError, ConflictError } from '@shared/errors/app-error';
import { Prisma } from '@prisma/client';

interface CreateCustomerDTO {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  notes?: string;
  addresses?: Array<{
    label?: string;
    street: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipCode?: string;
    referencePoint?: string;
    isDefault?: boolean;
  }>;
}

interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  isActive?: boolean;
}

interface SearchCustomersDTO {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class CustomerService {
  async create(data: CreateCustomerDTO, createdById?: string) {
    // Check if CPF already exists
    if (data.cpf) {
      const existing = await prisma.customer.findUnique({
        where: { cpf: data.cpf },
      });

      if (existing) {
        throw new ConflictError('CPF já cadastrado');
      }
    }

    const { addresses, ...customerData } = data;

    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        createdById,
        addresses: addresses
          ? {
              create: addresses,
            }
          : undefined,
      },
      include: {
        addresses: true,
      },
    });

    return customer;
  }

  async update(id: string, data: UpdateCustomerDTO) {
    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Cliente não encontrado');
    }

    // Check CPF uniqueness if updating
    if (data.cpf && data.cpf !== existing.cpf) {
      const cpfExists = await prisma.customer.findUnique({
        where: { cpf: data.cpf },
      });

      if (cpfExists) {
        throw new ConflictError('CPF já cadastrado');
      }
    }

    const { addresses, ...customerData } = data as any;

    const customer = await prisma.customer.update({
      where: { id },
      data: customerData,
      include: {
        addresses: true,
      },
    });

    return customer;
  }

  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
        sales: {
          take: 10,
          orderBy: { saleDate: 'desc' },
          select: {
            id: true,
            saleNumber: true,
            saleType: true,
            total: true,
            saleDate: true,
          },
        },
        loyaltyTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return customer;
  }

  async search(params: SearchCustomersDTO) {
    const { search, isActive = true, limit = 20, offset = 0 } = params;

    const where: Prisma.CustomerWhereInput = {
      isActive,
    };

    // Fuzzy search on name and phone
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: search,
          },
        },
        {
          cpf: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      limit,
      offset,
    };
  }

  async addAddress(customerId: string, addressData: any) {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    // If this is default, unset other defaults
    if (addressData.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.customerAddress.create({
      data: {
        ...addressData,
        customerId,
      },
    });

    return address;
  }

  async updateAddress(addressId: string, addressData: any) {
    const address = await prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundError('Endereço não encontrado');
    }

    // If setting as default, unset other defaults
    if (addressData.isDefault) {
      await prisma.customerAddress.updateMany({
        where: {
          customerId: address.customerId,
          id: { not: addressId },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.customerAddress.update({
      where: { id: addressId },
      data: addressData,
    });

    return updated;
  }

  async deleteAddress(addressId: string) {
    const address = await prisma.customerAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundError('Endereço não encontrado');
    }

    await prisma.customerAddress.delete({
      where: { id: addressId },
    });
  }

  async getTopCustomers(limit: number = 10) {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: [
        { totalPurchases: 'desc' },
        { purchaseCount: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        totalPurchases: true,
        purchaseCount: true,
        loyaltyPoints: true,
      },
    });

    return customers;
  }

  async getLoyaltyBalance(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        loyaltyPoints: true,
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Cliente não encontrado');
    }

    return customer;
  }
}
