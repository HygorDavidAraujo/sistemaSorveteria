import bcrypt from 'bcryptjs';
import prisma from '@infrastructure/database/prisma-client';
import { ConflictError, NotFoundError } from '@shared/errors/app-error';

interface CreateUserDTO {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'cashier';
}

interface UpdateUserDTO {
  email?: string;
  fullName?: string;
  role?: 'admin' | 'cashier';
  isActive?: boolean;
  password?: string;
}

export class UserService {
  async list() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return user;
  }

  async create(data: CreateUserDTO, createdById: string) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('E-mail já cadastrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        createdById,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async update(id: string, data: UpdateUserDTO) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Check if email is being changed and if it's already in use
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ConflictError('E-mail já cadastrado');
      }
    }

    // Prepare update data
    const updateData: any = {
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      isActive: data.isActive,
    };

    // Hash password if provided
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async toggleActive(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    return updatedUser;
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return { message: 'Usuário desativado com sucesso' };
  }
}
