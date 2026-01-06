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

    // Check if phone already exists (important for delivery)
    if (data.phone) {
      const existingByPhone = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: data.phone },
            { whatsapp: data.phone },
          ],
        },
      });

      if (existingByPhone) {
        throw new ConflictError('Telefone já cadastrado');
      }
    }

    // Check if whatsapp already exists
    if (data.whatsapp) {
      const existingByWhatsapp = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: data.whatsapp },
            { whatsapp: data.whatsapp },
          ],
        },
      });

      if (existingByWhatsapp) {
        throw new ConflictError('WhatsApp já cadastrado');
      }
    }

    const { addresses, ...customerData } = data;

    // Clean empty strings - convert to null for optional fields
    const cleanData = Object.entries(customerData).reduce((acc: any, [key, value]) => {
      if (value === '' && key !== 'notes') {
        acc[key] = null;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    const customer = await prisma.customer.create({
      data: {
        ...cleanData,
        createdById,
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

    // Clean empty strings - convert to null for optional fields
    const cleanData = Object.entries(customerData).reduce((acc: any, [key, value]) => {
      if (value === '' && key !== 'notes') {
        acc[key] = null;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    const customer = await prisma.customer.update({
      where: { id },
      data: cleanData,
    });

    return customer;
  }

  async findById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
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
          whatsapp: {
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
    // Inline address storage only; address table not available in schema
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundError('Cliente não encontrado');

    const cleanAddress = {
      street: addressData.street ?? null,
      number: addressData.number ?? null,
      complement: addressData.complement ?? null,
      neighborhood: addressData.neighborhood ?? null,
      city: addressData.city ?? null,
      state: addressData.state ?? null,
      zipCode: addressData.zipCode ?? null,
      referencePoint: addressData.referencePoint ?? null,
    };

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: cleanAddress,
    });

    return updated;
  }

  async updateAddress(addressId: string, addressData: any) {
    // Treat addressId as customerId for inline address update
    const customer = await prisma.customer.findUnique({ where: { id: addressId } });
    if (!customer) throw new NotFoundError('Cliente não encontrado');

    const cleanAddress = {
      street: addressData.street ?? null,
      number: addressData.number ?? null,
      complement: addressData.complement ?? null,
      neighborhood: addressData.neighborhood ?? null,
      city: addressData.city ?? null,
      state: addressData.state ?? null,
      zipCode: addressData.zipCode ?? null,
      referencePoint: addressData.referencePoint ?? null,
    };

    const updated = await prisma.customer.update({
      where: { id: addressId },
      data: cleanAddress,
    });

    return updated;
  }

  async deleteAddress(addressId: string) {
    // Clear inline address fields for given customer id
    const customer = await prisma.customer.findUnique({ where: { id: addressId } });
    if (!customer) throw new NotFoundError('Cliente não encontrado');

    await prisma.customer.update({
      where: { id: addressId },
      data: {
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
        referencePoint: null,
      },
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
