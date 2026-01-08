import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';

interface CompanyInfo {
  id?: string;
  cnpj: string;
  businessName: string;
  tradeName: string;
  phone?: string;
  whatsapp?: string;
  logoBase64?: string | null;
  logoMimeType?: string | null;
}

export const useCompanyInfo = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const response = await apiClient.get('/settings/company-info');
        if (response && response.data) {
          setCompanyInfo(response.data);
        }
      } catch (error) {
        console.error('Erro ao carregar informações da empresa:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyInfo();
  }, []);

  const getLogoUrl = () => {
    if (companyInfo?.logoBase64 && companyInfo?.logoMimeType) {
      return `data:${companyInfo.logoMimeType};base64,${companyInfo.logoBase64}`;
    }
    return null;
  };

  return { companyInfo, loading, getLogoUrl };
};
