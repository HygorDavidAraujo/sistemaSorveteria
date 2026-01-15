import prisma from '@infrastructure/database/prisma-client';

interface CreateCompanyInfoDTO {
  cnpj: string;
  businessName: string;
  tradeName: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  logoUrl?: string;
  logoBase64?: string;
  logoMimeType?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface UpdateCompanyInfoDTO extends Partial<CreateCompanyInfoDTO> {}

export class CompanyInfoService {
  async get() {
    const company = await (prisma as any).companyInfo.findFirst();
    
    // Return null if no company info is configured yet (not an error)
    return company;
  }

  async createOrUpdate(data: CreateCompanyInfoDTO | UpdateCompanyInfoDTO) {
    const existing = await (prisma as any).companyInfo.findFirst();

    const logoDataBuffer = data.logoBase64 ? Buffer.from(data.logoBase64, 'base64') : undefined;

    if (existing) {
      const latitude = Object.prototype.hasOwnProperty.call(data, 'latitude')
        ? (data as any).latitude
        : existing.latitude;
      const longitude = Object.prototype.hasOwnProperty.call(data, 'longitude')
        ? (data as any).longitude
        : existing.longitude;

      // Update existing
      const updated = await (prisma as any).companyInfo.update({
        where: { id: existing.id },
        data: {
          cnpj: data.cnpj || existing.cnpj,
          businessName: data.businessName || existing.businessName,
          tradeName: data.tradeName || existing.tradeName,
          stateRegistration: data.stateRegistration || existing.stateRegistration,
          municipalRegistration: data.municipalRegistration || existing.municipalRegistration,
          street: data.street || existing.street,
          number: data.number || existing.number,
          complement: data.complement || existing.complement,
          neighborhood: data.neighborhood || existing.neighborhood,
          city: data.city || existing.city,
          state: data.state || existing.state,
          zipCode: data.zipCode || existing.zipCode,
          email: data.email || existing.email,
          phone: data.phone || existing.phone,
          whatsapp: data.whatsapp || existing.whatsapp,
          logoUrl: data.logoUrl || existing.logoUrl,
          latitude,
          longitude,
          ...(logoDataBuffer
            ? {
                logoData: logoDataBuffer,
                logoMimeType: data.logoMimeType || existing.logoMimeType,
              }
            : {}),
        },
      });

      return updated;
    } else {
      // Create new (type-safe cast for new company info)
      const createData = data as CreateCompanyInfoDTO;
      const created = await (prisma as any).companyInfo.create({
        data: {
          cnpj: createData.cnpj,
          businessName: createData.businessName,
          tradeName: createData.tradeName,
          stateRegistration: createData.stateRegistration,
          municipalRegistration: createData.municipalRegistration,
          street: createData.street,
          number: createData.number,
          complement: createData.complement,
          neighborhood: createData.neighborhood,
          city: createData.city,
          state: createData.state,
          zipCode: createData.zipCode,
          email: createData.email,
          phone: createData.phone,
          whatsapp: createData.whatsapp,
          logoUrl: createData.logoUrl,
          logoData: logoDataBuffer,
          logoMimeType: createData.logoMimeType,
          latitude: createData.latitude ?? null,
          longitude: createData.longitude ?? null,
        },
      });

      return created;
    }
  }
}
