import React from 'react';
import { useAuthStore } from '@/store';
import { Card, Button, Alert, Modal, Input } from '@/components/common';
import { Settings, LogOut, Plus, Edit2, Power, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './SettingsPage.css';
import { apiClient } from '@/services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'cashier';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
}

interface CompanyInfo {
  id?: string;
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
  logoBase64?: string | null;
  logoMimeType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

type ScaleManufacturer = 'TOLEDO' | 'URANO' | 'FILIZOLA' | 'GENERIC';
type ScaleProtocol = 'toledo_prix' | 'urano' | 'filizola' | 'generic';
type ScaleParity = 'none' | 'even' | 'odd' | 'mark' | 'space';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // Calculate isAdmin early, before it's used in effects
  const isAdmin = user?.role === 'admin';
  
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'company' | 'delivery' | 'loyalty' | 'scale' | 'printer'>('user');
  const [terminalId, setTerminalId] = useState<string>(
    localStorage.getItem('terminalId') || 'TERMINAL_01'
  );
  const [isEditingTerminal, setIsEditingTerminal] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  
  // Helper functions for formatting
  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 8);
  };

  const getScaleDefaults = (manufacturer: ScaleManufacturer) => {
    switch (manufacturer) {
      case 'URANO':
        return {
          manufacturer: 'URANO' as ScaleManufacturer,
          model: 'URANO POP-Z' as string,
          protocol: 'urano' as ScaleProtocol,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none' as ScaleParity,
          readTimeoutMs: 1500,
          stableOnly: true,
          requestCommand: '',
        };
      case 'FILIZOLA':
        return {
          manufacturer: 'FILIZOLA' as ScaleManufacturer,
          model: 'FILIZOLA MF-300' as string,
          protocol: 'filizola' as ScaleProtocol,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none' as ScaleParity,
          readTimeoutMs: 1500,
          stableOnly: true,
          requestCommand: '',
        };
      case 'GENERIC':
        return {
          manufacturer: 'GENERIC' as ScaleManufacturer,
          model: 'Balança Serial' as string,
          protocol: 'generic' as ScaleProtocol,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none' as ScaleParity,
          readTimeoutMs: 1500,
          stableOnly: false,
          requestCommand: '',
        };
      case 'TOLEDO':
      default:
        return {
          manufacturer: 'TOLEDO' as ScaleManufacturer,
          model: 'PRIX 3 FIT' as string,
          protocol: 'toledo_prix' as ScaleProtocol,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none' as ScaleParity,
          readTimeoutMs: 1500,
          stableOnly: true,
          requestCommand: '',
        };
    }
  };
  
  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cashier' as 'admin' | 'cashier',
  });
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    cnpj: '',
    businessName: '',
    tradeName: '',
    stateRegistration: '',
    municipalRegistration: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'GO',
    zipCode: '',
    email: '',
    phone: '',
    whatsapp: '',
    logoUrl: '',
    logoBase64: null,
    logoMimeType: null,
    latitude: null,
    longitude: null,
  });

  // Loyalty/Cashback config state
  const [loyaltyConfig, setLoyaltyConfig] = useState({
    pointsPerReal: 1,
    minPurchaseForPoints: 0,
    pointsExpirationDays: 365,
    minPointsToRedeem: 100,
    pointsRedemptionValue: 0.01,
    applyToAllProducts: true,
    isActive: true,
  });

  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState(false);
  const [cashbackConfig, setCashbackConfig] = useState({
    cashbackPercentage: 2,
    minPurchaseForCashback: 0,
    maxCashbackPerPurchase: null as number | null,
    cashbackExpirationDays: null as number | null,
    minCashbackToUse: 5,
    applyToAllProducts: true,
    isActive: true,
  });
  const [isLoadingCashback, setIsLoadingCashback] = useState(false);

  // Delivery config state
  const [deliveryConfig, setDeliveryConfig] = useState({
    defaultFee: '5.00',
    feePerKm: '1.50',
    freeDistanceKm: '5',
    minTimeMinutes: '30',
    maxTimeMinutes: '60',
    minOrderValue: '20.00',
    enableFees: true,
    enableMinOrder: false,
  });
  const [deliveryFees, setDeliveryFees] = useState<any[]>([]);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

  // Scale config state
  const [scaleConfig, setScaleConfig] = useState({
    isEnabled: false,
    manufacturer: 'TOLEDO' as ScaleManufacturer,
    model: 'PRIX 3 FIT',
    protocol: 'toledo_prix' as ScaleProtocol,
    port: 'COM3',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none' as ScaleParity,
    stableOnly: true,
    readTimeoutMs: 1500,
    requestCommand: '',
  });
  const [isLoadingScale, setIsLoadingScale] = useState(false);
  const [isTestingScale, setIsTestingScale] = useState(false);
  const [scaleTestResult, setScaleTestResult] = useState<string | null>(null);
  const [availableScalePorts, setAvailableScalePorts] = useState<
    Array<{ path: string; friendlyName?: string; manufacturer?: string }>
  >([]);
  const [scalePortsWarning, setScalePortsWarning] = useState<string | null>(null);

  // Printer config state
  const [printerConfig, setPrinterConfig] = useState({
    paperWidth: '80mm',
    contentWidth: '70mm',
    fontFamily: 'Courier New',
    fontSize: 11,
    lineHeight: 1.4,
    marginMm: 5,
    maxCharsPerLine: 42,
    showLogo: true,
    showCompanyInfo: true,
    footerText: 'Documento não fiscal',
    footerSecondaryText: 'Gelatini © 2026',
  });
  const [isLoadingPrinter, setIsLoadingPrinter] = useState(false);

  useEffect(() => {
    if (activeTab === 'user' && isAdmin && users.length === 0 && !isLoadingUsers) {
      loadUsers();
    }
    if (activeTab === 'company' && !companyInfo.cnpj && !isLoadingCompany) {
      loadCompanyInfo();
    }
    if (activeTab === 'delivery' && !isLoadingDelivery && deliveryFees.length === 0) {
      loadDeliveryFees();
    }
    if (activeTab === 'loyalty' && !isLoadingLoyalty && loyaltyConfig.pointsPerReal === 1 && loyaltyConfig.pointsExpirationDays === 365) {
      loadLoyaltyConfig();
      loadCashbackConfig();
    }
    if (activeTab === 'scale' && isAdmin && !isLoadingScale) {
      loadScaleConfig();
      loadScalePorts();
    }
    if (activeTab === 'printer' && isAdmin && !isLoadingPrinter) {
      loadPrinterConfig();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const result = await apiClient.get('/users');
      console.log('Users API response:', result);
      if (result && result.data) {
        setUsers(result.data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      setError(err.response?.data?.message || 'Erro ao carregar usuários');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadCompanyInfo = async () => {
    try {
      setIsLoadingCompany(true);
      setError(null);
      console.log('📥 Carregando informações da empresa...');
      const response = await apiClient.get('/settings/company-info');
      console.log('📦 Resposta recebida:', response);
      if (response && response.data) {
        const data = response.data;
        console.log('✅ Dados da empresa carregados:', data);
        setCompanyInfo(prev => ({
          ...prev,
          ...data,
          logoBase64: data.logoBase64 ?? null,
          logoMimeType: data.logoMimeType ?? null,
        }));
      } else {
        console.log('⚠️ Nenhum dado encontrado na resposta');
      }
    } catch (err: any) {
      console.error('❌ Erro ao carregar informações da empresa:', err);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const loadScaleConfig = async () => {
    try {
      setIsLoadingScale(true);
      setScaleTestResult(null);
      const response = await apiClient.get('/settings/scale');
      if (response?.data) {
        const data = response.data;
        setScaleConfig((prev) => ({
          ...prev,
          ...data,
          requestCommand: data.requestCommand || '',
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar configurações da balança');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingScale(false);
    }
  };

  const handleSaveScaleConfig = async () => {
    try {
      setIsLoadingScale(true);
      setError(null);
      const payload = {
        ...scaleConfig,
        requestCommand: scaleConfig.requestCommand?.trim() || null,
      };
      await apiClient.put('/settings/scale', payload);
      setSuccess('Configurações da balança salvas com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configurações da balança');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingScale(false);
    }
  };

  const handleTestScale = async () => {
    try {
      setIsTestingScale(true);
      setScaleTestResult(null);
      const response = await apiClient.get('/scale/weight');
      const weightRaw = Number((response as any)?.weightKg ?? (response as any)?.data?.weightKg);
      const weight = Number.isFinite(weightRaw) && weightRaw > 100 && weightRaw < 100000
        ? weightRaw / 1000
        : weightRaw;
      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error('Leitura inválida');
      }
      setScaleTestResult(`Peso lido: ${weight.toFixed(3)} kg`);
    } catch (err: any) {
      setScaleTestResult(err.response?.data?.message || err.message || 'Falha ao ler balança');
    } finally {
      setIsTestingScale(false);
    }
  };

  const loadScalePorts = async () => {
    try {
      setScalePortsWarning(null);
      const response = await apiClient.get('/scale/ports');
      const ports = (response as any)?.ports ?? (response as any)?.data?.ports ?? [];
      const warning = (response as any)?.warning ?? (response as any)?.data?.warning ?? null;
      if (Array.isArray(ports)) {
        setAvailableScalePorts(ports);
      }
      if (warning) {
        setScalePortsWarning(String(warning));
      }
    } catch (err: any) {
      setAvailableScalePorts([]);
      setScalePortsWarning(err?.message || 'Não foi possível listar portas seriais');
    }
  };

  const loadPrinterConfig = async () => {
    try {
      setIsLoadingPrinter(true);
      const response = await apiClient.get('/settings/printer');
      const data = (response as any)?.data || response;
      if (data?.data || data) {
        const config = data?.data || data;
        setPrinterConfig((prev) => ({
          ...prev,
          ...config,
          fontSize: Number(config.fontSize ?? prev.fontSize),
          lineHeight: Number(config.lineHeight ?? prev.lineHeight),
          marginMm: Number(config.marginMm ?? prev.marginMm),
          maxCharsPerLine: Number(config.maxCharsPerLine ?? prev.maxCharsPerLine),
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar configurações de impressão');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingPrinter(false);
    }
  };

  const handleSavePrinterConfig = async () => {
    try {
      setIsLoadingPrinter(true);
      setError(null);
      const payload = {
        ...printerConfig,
        fontSize: Number(printerConfig.fontSize),
        lineHeight: Number(printerConfig.lineHeight),
        marginMm: Number(printerConfig.marginMm),
        maxCharsPerLine: Number(printerConfig.maxCharsPerLine),
      };
      await apiClient.put('/settings/printer', payload);
      setSuccess('Configurações de impressão salvas com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configurações de impressão');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingPrinter(false);
    }
  };

  const handleLookupCompanyCep = async () => {
    try {
      const cep = formatCEP(companyInfo.zipCode);
      if (cep.length !== 8) {
        setError('Informe um CEP válido (8 dígitos)');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setIsLoadingCompany(true);
      const result = await apiClient.searchCepAddress(cep);
      const data = result?.data;

      if (!data) {
        throw new Error('CEP não encontrado');
      }

      setCompanyInfo((prev) => {
        const parsedLatitude = Number((data as any).latitude);
        const parsedLongitude = Number((data as any).longitude);

        return {
          ...prev,
          zipCode: cep,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.cidade || prev.city,
          state: data.estado || prev.state,
          latitude: Number.isFinite(parsedLatitude) ? parsedLatitude : prev.latitude,
          longitude: Number.isFinite(parsedLongitude) ? parsedLongitude : prev.longitude,
        };
      });

      setSuccess('CEP encontrado. Endereço e coordenadas preenchidos!');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao buscar CEP');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const loadLoyaltyConfig = async () => {
    if (isLoadingLoyalty) return; // Prevent duplicate calls
    try {
      setIsLoadingLoyalty(true);
      const response: any = await apiClient.get('/loyalty/config');
      const data = response?.data ?? response;
      if (data) {
        setLoyaltyConfig({
          pointsPerReal: Number(data.pointsPerReal ?? 1),
          minPurchaseForPoints: Number(data.minPurchaseForPoints ?? 0),
          pointsExpirationDays: Number(data.pointsExpirationDays ?? 365),
          minPointsToRedeem: Number(data.minPointsToRedeem ?? 100),
          pointsRedemptionValue: Number(data.pointsRedemptionValue ?? 0.01),
          applyToAllProducts: data.applyToAllProducts ?? true,
          isActive: data.isActive ?? true,
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar configuração de lealdade:', err);
      // Don't set error state for auto-load failures
    } finally {
      setIsLoadingLoyalty(false);
    }
  };

  const loadCashbackConfig = async () => {
    if (isLoadingCashback) return; // Prevent duplicate calls
    try {
      setIsLoadingCashback(true);
      const response: any = await apiClient.get('/cashback/config');
      const data = response?.data ?? response;
      if (data) {
        setCashbackConfig({
          cashbackPercentage: Number(data.cashbackPercentage ?? 2),
          minPurchaseForCashback: Number(data.minPurchaseForCashback ?? 0),
          maxCashbackPerPurchase: data.maxCashbackPerPurchase === null || data.maxCashbackPerPurchase === undefined
            ? null
            : Number(data.maxCashbackPerPurchase),
          cashbackExpirationDays: data.cashbackExpirationDays === null || data.cashbackExpirationDays === undefined
            ? null
            : Number(data.cashbackExpirationDays),
          minCashbackToUse: Number(data.minCashbackToUse ?? 5),
          applyToAllProducts: data.applyToAllProducts ?? true,
          isActive: data.isActive ?? true,
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar configuração de cashback:', err);
      // Don't set error state for auto-load failures
    } finally {
      setIsLoadingCashback(false);
    }
  };

  const loadDeliveryFees = async () => {
    if (isLoadingDelivery) return;
    try {
      setIsLoadingDelivery(true);
      const response = await apiClient.get('/delivery/fees');
      if (response.data) {
        setDeliveryFees(response.data);
        // Se houver uma taxa padrão, popular o form
        if (response.data.length > 0) {
          const defaultFee = response.data.find((f: any) => !f.neighborhood && !f.city) || response.data[0];
          setDeliveryConfig({
            defaultFee: defaultFee.fee?.toString() || '5.00',
            feePerKm: defaultFee.feePerKm?.toString() || '1.50',
            freeDistanceKm: defaultFee.maxDistance?.toString() || '5',
            minTimeMinutes: '30',
            maxTimeMinutes: '60',
            minOrderValue: defaultFee.minOrderValue?.toString() || '20.00',
            enableFees: defaultFee.isActive !== false,
            enableMinOrder: (defaultFee.minOrderValue || 0) > 0,
          });
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar taxas de entrega:', err);
    } finally {
      setIsLoadingDelivery(false);
    }
  };

  const handleSaveDeliveryConfig = async () => {
    try {
      setIsLoadingDelivery(true);

      const toNumber = (value: string, fallback = 0) => {
        const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      // Criar ou atualizar a taxa padrão (configuração por distância)
      // OBS: não enviamos `null` para campos string/number para não bater no Joi.
      const feeData = {
        feeType: 'distance',
        fee: toNumber(deliveryConfig.defaultFee, 0),
        minOrderValue: deliveryConfig.enableMinOrder ? toNumber(deliveryConfig.minOrderValue, 0) : 0,
        maxDistance: toNumber(deliveryConfig.freeDistanceKm, 0),
        feePerKm: toNumber(deliveryConfig.feePerKm, 0),
        baseFee: toNumber(deliveryConfig.defaultFee, 0),
        isActive: deliveryConfig.enableFees,
      };

      // Verificar se já existe uma taxa padrão
      const existingFee = deliveryFees.find((f: any) => !f.neighborhood && !f.city);
      
      if (existingFee) {
        // Atualizar
        await apiClient.put(`/delivery/fees/${existingFee.id}`, feeData);
      } else {
        // Criar
        await apiClient.post('/delivery/fees', feeData);
      }

      setSuccess('Configuração de entrega salva com sucesso!');
      await loadDeliveryFees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração de entrega');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoadingDelivery(false);
    }
  };

  const handleSaveLoyaltyConfig = async () => {
    try {
      await apiClient.patch('/loyalty/config', loyaltyConfig);
      setSuccess('Configuração de lealdade salva com sucesso!');
      // Recarregar dados após salvar
      await loadLoyaltyConfig();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSaveCashbackConfig = async () => {
    try {
      const normalizeNullableNumber = (value: unknown) => {
        if (value === null || value === undefined || value === '') return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      const payload = {
        ...cashbackConfig,
        cashbackPercentage: normalizeNullableNumber(cashbackConfig.cashbackPercentage) ?? 0,
        minPurchaseForCashback: normalizeNullableNumber(cashbackConfig.minPurchaseForCashback) ?? 0,
        minCashbackToUse: normalizeNullableNumber(cashbackConfig.minCashbackToUse) ?? 0,
        maxCashbackPerPurchase: normalizeNullableNumber(cashbackConfig.maxCashbackPerPurchase),
        cashbackExpirationDays: normalizeNullableNumber(cashbackConfig.cashbackExpirationDays),
      };

      await apiClient.patch('/cashback/config', payload);
      setSuccess('Configuração de cashback salva com sucesso!');
      // Recarregar dados após salvar
      await loadCashbackConfig();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Apply formatting based on field name
    if (name === 'cnpj') {
      formattedValue = formatCNPJ(value);
    } else if (name === 'zipCode') {
      formattedValue = formatCEP(value);
    }
    
    setCompanyInfo(prev => ({
      ...prev,
      [name]: formattedValue,
    }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setCompanyInfo(prev => ({
        ...prev,
        logoBase64: base64,
        logoMimeType: file.type,
        logoUrl: '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoadingCompany(true);
      setError(null);
      setSuccess(null);

      const normalizeCoordinate = (value: unknown): number | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const normalizedZip = formatCEP(companyInfo.zipCode);
      const normalizedLatitude = normalizeCoordinate(companyInfo.latitude as unknown);
      const normalizedLongitude = normalizeCoordinate(companyInfo.longitude as unknown);

      const latitudeToSave =
        normalizedLatitude === 0 && normalizedLongitude === 0 ? null : normalizedLatitude;
      const longitudeToSave =
        normalizedLatitude === 0 && normalizedLongitude === 0 ? null : normalizedLongitude;

      const payload: CompanyInfo = {
        ...companyInfo,
        zipCode: normalizedZip,
        latitude: latitudeToSave,
        longitude: longitudeToSave,
      };

      console.log('📤 Enviando dados da empresa:', payload);
      const response = await apiClient.post('/settings/company-info', payload);
      console.log('✅ Resposta do servidor:', response);
      
      setSuccess('Informações da empresa atualizadas com sucesso!');
      
      // Recarregar dados após salvar
      await loadCompanyInfo();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('❌ Erro ao salvar:', err);
      setError(err.response?.data?.message || 'Erro ao salvar informações');
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      await logout();
      navigate('/login');
    }
  };

  const handleExportData = () => {
    setSuccess('Dados exportados com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSaveTerminal = () => {
    if (!terminalId.trim()) {
      alert('Por favor, informe o ID do terminal');
      return;
    }
    localStorage.setItem('terminalId', terminalId.trim());
    setIsEditingTerminal(false);
    setSuccess('Terminal configurado com sucesso! Recarregue a página para aplicar.');
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleCancelEditTerminal = () => {
    setTerminalId(localStorage.getItem('terminalId') || 'TERMINAL_01');
    setIsEditingTerminal(false);
  };

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setIsEditingUser(true);
      setSelectedUser(user);
      setUserForm({
        email: user.email,
        password: '',
        fullName: user.fullName,
        role: user.role,
      });
    } else {
      setIsEditingUser(false);
      setSelectedUser(null);
      setUserForm({
        email: '',
        password: '',
        fullName: '',
        role: 'cashier',
      });
    }
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setIsEditingUser(false);
    setSelectedUser(null);
    setUserForm({
      email: '',
      password: '',
      fullName: '',
      role: 'cashier',
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      if (isEditingUser && selectedUser) {
        // Update user
        const updateData: any = {
          email: userForm.email,
          fullName: userForm.fullName,
          role: userForm.role,
        };
        if (userForm.password) {
          updateData.password = userForm.password;
        }
        await apiClient.put(`/users/${selectedUser.id}`, updateData);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        // Create user
        await apiClient.post('/users', userForm);
        setSuccess('Usuário criado com sucesso!');
      }
      
      handleCloseUserModal();
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar usuário');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    try {
      setError(null);
      await apiClient.patch(`/users/${userId}/toggle-active`, {});
      setSuccess('Status do usuário alterado com sucesso!');
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao alterar status');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <>
    <div className="settings-page">
      <div className="page-header">
        <Settings size={32} />
        <h1>Configurações</h1>
      </div>

      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}
          onClick={() => setActiveTab('user')}
        >
          👤 Usuário
        </button>
        <button
          className={`tab-button ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          ℹ️ Empresa
        </button>
        {isAdmin && (
          <>
            <button
              className={`tab-button ${activeTab === 'delivery' ? 'active' : ''}`}
              onClick={() => setActiveTab('delivery')}
            >
              🚚 Entrega
            </button>
            <button
              className={`tab-button ${activeTab === 'loyalty' ? 'active' : ''}`}
              onClick={() => setActiveTab('loyalty')}
            >
              🎁 Fidelidade
            </button>
            <button
              className={`tab-button ${activeTab === 'scale' ? 'active' : ''}`}
              onClick={() => setActiveTab('scale')}
            >
              ⚖️ Balança
            </button>
            <button
              className={`tab-button ${activeTab === 'printer' ? 'active' : ''}`}
              onClick={() => setActiveTab('printer')}
            >
              🖨️ Impressão
            </button>
          </>
        )}
      </div>

      {/* User Management Tab */}
      {activeTab === 'user' && isAdmin && (
      <>
        <div className="settings-header">
          <h2 className="settings-section-title">Gerenciamento de Usuários</h2>
          <Button variant="primary" onClick={() => handleOpenUserModal()}>
            <Plus size={18} />
            Novo Usuário
          </Button>
        </div>

        {isLoadingUsers ? (
          <Card>
            <div className="settings-info-value">Carregando usuários...</div>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <div className="settings-info-value">Nenhum usuário cadastrado</div>
          </Card>
        ) : (
          <Card>
            <div className="settings-users-table-wrapper">
              <table className="settings-users-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Último Login</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((userItem) => (
                    <tr key={userItem.id}>
                      <td>
                        <div className="settings-user-name">{userItem.fullName}</div>
                        {userItem.createdBy && (
                          <div className="settings-user-meta">
                            Criado por: {userItem.createdBy.fullName}
                          </div>
                        )}
                      </td>
                      <td>{userItem.email}</td>
                      <td>
                        <span className={`settings-role-badge settings-role-${userItem.role}`}>
                          {userItem.role === 'admin' ? 'Administrador' : 'Caixa'}
                        </span>
                      </td>
                      <td>
                        <span className={`settings-status-badge ${userItem.isActive ? 'active' : 'inactive'}`}>
                          {userItem.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        {userItem.lastLoginAt 
                          ? new Date(userItem.lastLoginAt).toLocaleString('pt-BR')
                          : 'Nunca'
                        }
                      </td>
                      <td>
                        <div className="settings-table-actions">
                          <button
                            className="settings-action-btn settings-action-edit"
                            onClick={() => handleOpenUserModal(userItem)}
                            title="Editar usuário"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className={`settings-action-btn ${userItem.isActive ? 'settings-action-deactivate' : 'settings-action-activate'}`}
                            onClick={() => handleToggleUserActive(userItem.id)}
                            title={userItem.isActive ? 'Desativar' : 'Ativar'}
                            disabled={userItem.id === user?.id}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* User Info Card */}
        <Card>
          <h2 className="settings-section-title">Meu Perfil</h2>
          <div className="settings-info-grid">
            <div className="settings-info-item">
              <p className="settings-info-label">Nome</p>
              <p className="settings-info-value">{user?.name}</p>
            </div>
            <div className="settings-info-item">
              <p className="settings-info-label">Email</p>
              <p className="settings-info-value">{user?.email}</p>
            </div>
            <div className="settings-info-item">
              <p className="settings-info-label">Função</p>
              <p className="settings-info-value settings-role">{user?.role === 'admin' ? 'Administrador' : 'Caixa'}</p>
            </div>
            <div className="settings-info-item">
              <p className="settings-info-label">ID do Usuário</p>
              <p className="settings-info-value settings-user-id">{user?.id}</p>
            </div>
          </div>
        </Card>
      </>
      )}

      {/* User Profile Tab (for non-admin) */}
      {activeTab === 'user' && !isAdmin && (
      <Card>
        <h2 className="settings-section-title">Perfil do Usuário</h2>

        <div className="settings-info-grid">
          <div className="settings-info-item">
            <p className="settings-info-label">Nome</p>
            <p className="settings-info-value">{user?.name}</p>
          </div>

          <div className="settings-info-item">
            <p className="settings-info-label">Email</p>
            <p className="settings-info-value">{user?.email}</p>
          </div>

          <div className="settings-info-item">
            <p className="settings-info-label">Função</p>
            <p className="settings-info-value settings-role">{user?.role === 'admin' ? 'Administrador' : 'Caixa'}</p>
          </div>

          <div className="settings-info-item">
            <p className="settings-info-label">ID do Usuário</p>
            <p className="settings-info-value settings-user-id">{user?.id}</p>
          </div>
        </div>

        <div className="settings-button-group">
          <Button variant="secondary">
            Editar Perfil
          </Button>
          <Button variant="secondary">
            Alterar Senha
          </Button>
        </div>
      </Card>
      )}

      {/* System Settings */}
      {activeTab === 'user' && (
      <Card>
        <h2 className="settings-section-title">Configurações do Sistema</h2>

        <div className="settings-options">
          {/* Terminal Configuration - Admin Only */}
          {isAdmin && (
            <div className="settings-option-item settings-terminal-config">
              <div className="settings-terminal-header">
                <div>
                  <p className="settings-option-title settings-terminal-title">
                    🔧 Configuração de Terminal (Admin)
                  </p>
                  <p className="settings-option-description settings-terminal-description">
                    Define o identificador único deste terminal/PDV
                  </p>
                </div>
                {!isEditingTerminal && (
                  <Button variant="secondary" onClick={() => setIsEditingTerminal(true)}>
                    Alterar
                  </Button>
                )}
              </div>

              {isEditingTerminal ? (
                <div className="settings-terminal-edit-wrapper">
                  <label className="settings-terminal-label">
                    ID do Terminal:
                  </label>
                  <input
                    type="text"
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value.toUpperCase())}
                    placeholder="Ex: TERMINAL_01, PDV_LOJA_01"
                    className="settings-terminal-input"
                  />
                  <div className="settings-terminal-buttons">
                    <Button variant="primary" onClick={handleSaveTerminal}>
                      Salvar Terminal
                    </Button>
                    <Button variant="secondary" onClick={handleCancelEditTerminal}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="settings-terminal-display">
                  {terminalId}
                </div>
              )}
            </div>
          )}

          <div className="settings-option-item">
            <div>
              <p className="settings-option-title">Tema Escuro</p>
              <p className="settings-option-description">Use tema escuro na interface</p>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" className="settings-toggle-input" title="Ativar tema escuro" />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          <div className="settings-option-item">
            <div>
              <p className="settings-option-title">Notificações</p>
              <p className="settings-option-description">Receber notificações de vendas</p>
            </div>
            <label className="settings-toggle">
              <input type="checkbox" className="settings-toggle-input" defaultChecked title="Ativar notificações" />
              <div className="settings-toggle-slider"></div>
            </label>
          </div>

          <div className="settings-option-item settings-select-container">
            <p className="settings-option-title">Idioma</p>
            <select className="settings-select" title="Selecionar idioma">
              <option>Português (Brasil)</option>
              <option>English</option>
              <option>Español</option>
            </select>
          </div>
        </div>
      </Card>
      )}

      {/* Data Management */}
      {activeTab === 'user' && (
      <Card>
        <h2 className="settings-section-title">Gerenciamento de Dados</h2>

        <div className="settings-data-management">
          <div className="settings-data-item">
            <p className="settings-data-title">Exportar Dados</p>
            <p className="settings-data-description">
              Baixe todos os seus dados em formato CSV
            </p>
            <Button
              variant="secondary"
              onClick={handleExportData}
            >
              Exportar Dados
            </Button>
          </div>

          <div className="settings-danger-zone">
            <p className="settings-danger-title">Zona de Perigo</p>
            <p className="settings-danger-description">
              Esta ação não pode ser desfeita. Todos os dados serão perdidos.
            </p>
            <Button variant="danger">
              Limpar Todos os Dados
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Session Management */}
      {activeTab === 'user' && (
      <Card>
        <h2 className="settings-section-title">Gerenciar Sessão</h2>

        <div className="settings-session">
          <div className="settings-info-item">
            <p className="settings-info-label">Versão do Sistema</p>
            <p className="settings-info-value">1.0.0</p>
          </div>

          <Button
            variant="danger"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            Fazer Logout
          </Button>
        </div>
      </Card>
      )}

      {/* Company Info Tab */}
      {activeTab === 'company' && (
      <Card>
        <h2 className="settings-section-title">Informações da Empresa</h2>
        
        {isLoadingCompany ? (
          <div className="settings-info-value">Carregando...</div>
        ) : (
          <form onSubmit={handleCompanyInfoSubmit} className="settings-company-form">
            {/* Dados da Empresa */}
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">📋 Dados da Empresa</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    value={companyInfo.cnpj}
                    onChange={handleCompanyInfoChange}
                    placeholder="00.000.000/0000-00"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Razão Social *</label>
                  <input
                    type="text"
                    name="businessName"
                    value={companyInfo.businessName}
                    onChange={handleCompanyInfoChange}
                    placeholder="Nome empresarial"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Nome Fantasia *</label>
                  <input
                    type="text"
                    name="tradeName"
                    value={companyInfo.tradeName}
                    onChange={handleCompanyInfoChange}
                    placeholder="Nome comercial"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Inscrição Estadual</label>
                  <input
                    type="text"
                    name="stateRegistration"
                    value={companyInfo.stateRegistration || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="000.000.000.000"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Inscrição Municipal</label>
                  <input
                    type="text"
                    name="municipalRegistration"
                    value={companyInfo.municipalRegistration || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="00000000"
                    className="settings-form-input"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">📍 Endereço</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">CEP *</label>
                  <div className="settings-cep-row">
                    <input
                      type="text"
                      name="zipCode"
                      value={companyInfo.zipCode}
                      onChange={handleCompanyInfoChange}
                      placeholder="00000-000"
                      className="settings-form-input"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleLookupCompanyCep}
                      className="settings-btn settings-btn-primary settings-cep-button"
                      disabled={isLoadingCompany}
                      title="Buscar CEP e preencher coordenadas da loja"
                    >
                      Buscar CEP
                    </button>
                  </div>
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Latitude (origem)</label>
                  <input
                    type="number"
                    name="latitude"
                    value={companyInfo.latitude ?? ''}
                    onChange={(e) =>
                      setCompanyInfo((prev) => ({
                        ...prev,
                        latitude: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                    placeholder="Ex.: -16.6869"
                    className="settings-form-input"
                    step="any"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Longitude (origem)</label>
                  <input
                    type="number"
                    name="longitude"
                    value={companyInfo.longitude ?? ''}
                    onChange={(e) =>
                      setCompanyInfo((prev) => ({
                        ...prev,
                        longitude: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                    placeholder="Ex.: -49.2648"
                    className="settings-form-input"
                    step="any"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Rua *</label>
                  <input
                    type="text"
                    name="street"
                    value={companyInfo.street}
                    onChange={handleCompanyInfoChange}
                    placeholder="Nome da rua"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Número *</label>
                  <input
                    type="text"
                    name="number"
                    value={companyInfo.number}
                    onChange={handleCompanyInfoChange}
                    placeholder="123"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Complemento</label>
                  <input
                    type="text"
                    name="complement"
                    value={companyInfo.complement || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="Sala, andar, etc"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Bairro *</label>
                  <input
                    type="text"
                    name="neighborhood"
                    value={companyInfo.neighborhood}
                    onChange={handleCompanyInfoChange}
                    placeholder="Bairro"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Cidade *</label>
                  <input
                    type="text"
                    name="city"
                    value={companyInfo.city}
                    onChange={handleCompanyInfoChange}
                    placeholder="Cidade"
                    className="settings-form-input"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Estado *</label>
                  <input
                    type="text"
                    name="state"
                    value={companyInfo.state}
                    onChange={handleCompanyInfoChange}
                    placeholder="UF"
                    maxLength={2}
                    className="settings-form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contatos */}
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">📞 Contatos</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={companyInfo.email || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="contato@empresa.com.br"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Telefone</label>
                  <input
                    type="text"
                    name="phone"
                    value={companyInfo.phone || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="(00) 0000-0000"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">WhatsApp</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={companyInfo.whatsapp || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="(00) 00000-0000"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="logoUrl">URL da Logo</label>
                  <input
                    type="text"
                    id="logoUrl"
                    name="logoUrl"
                    value={companyInfo.logoUrl || ''}
                    onChange={handleCompanyInfoChange}
                    placeholder="https://exemplo.com/logo.png"
                    className="settings-form-input"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label" htmlFor="logoFile">Upload da Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    id="logoFile"
                    title="Selecionar arquivo da logo"
                    aria-label="Selecionar arquivo da logo"
                    placeholder="Escolha a logo"
                    onChange={handleLogoFileChange}
                    className="settings-form-input"
                  />
                  {(companyInfo.logoBase64 || companyInfo.logoUrl) && (
                    <div className="settings-logo-preview">
                      <img
                        src={companyInfo.logoBase64 ? `data:${companyInfo.logoMimeType || 'image/png'};base64,${companyInfo.logoBase64}` : companyInfo.logoUrl}
                        alt="Logo da empresa"
                        className="settings-logo-img"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-form-actions">
              <Button type="submit" variant="primary" disabled={isLoadingCompany}>
                {isLoadingCompany ? 'Salvando...' : 'Salvar Informações'}
              </Button>
              <Button type="button" variant="secondary" onClick={loadCompanyInfo}>
                Recarregar
              </Button>
            </div>
          </form>
        )}
      </Card>
      )}

      {/* Delivery Settings Tab */}
      {activeTab === 'delivery' && isAdmin && (
      <Card>
        <h2 className="settings-section-title">Configurações de Entrega</h2>
        
        <div className="settings-delivery-form">
          {/* Taxa de Entrega */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">🚚 Taxa de Entrega</p>
                <p className="settings-delivery-option-description">
                  Configure as taxas de entrega por distância ou região
                </p>
              </div>
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  className="settings-toggle-input" 
                  checked={deliveryConfig.enableFees}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, enableFees: e.target.checked})}
                  title="Ativar taxa de entrega" 
                />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Taxa Padrão (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  value={deliveryConfig.defaultFee}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, defaultFee: e.target.value})}
                  className="settings-form-input"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Taxa por Km (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="1.50"
                  value={deliveryConfig.feePerKm}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, feePerKm: e.target.value})}
                  className="settings-form-input"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Distância Grátis (Km)</label>
                <input
                  type="number"
                  placeholder="5"
                  value={deliveryConfig.freeDistanceKm}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, freeDistanceKm: e.target.value})}
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          {/* Tempo de Entrega */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">⏱️ Tempo de Entrega</p>
                <p className="settings-delivery-option-description">
                  Defina o tempo estimado de entrega
                </p>
              </div>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Tempo Mínimo (min)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={deliveryConfig.minTimeMinutes}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, minTimeMinutes: e.target.value})}
                  className="settings-form-input"
                />
              </div>
              <div className="settings-form-group">
                <label className="settings-form-label">Tempo Máximo (min)</label>
                <input
                  type="number"
                  placeholder="60"
                  value={deliveryConfig.maxTimeMinutes}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, maxTimeMinutes: e.target.value})}
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          {/* Pedido Mínimo */}
          <div className="settings-delivery-option">
            <div className="settings-delivery-option-header">
              <div>
                <p className="settings-delivery-option-title">💰 Pedido Mínimo</p>
                <p className="settings-delivery-option-description">
                  Valor mínimo para aceitar pedidos de entrega
                </p>
              </div>
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  className="settings-toggle-input" 
                  checked={deliveryConfig.enableMinOrder}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, enableMinOrder: e.target.checked})}
                  title="Ativar pedido mínimo" 
                />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
            <div className="settings-delivery-fees">
              <div className="settings-form-group">
                <label className="settings-form-label">Valor Mínimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="20.00"
                  value={deliveryConfig.minOrderValue}
                  onChange={(e) => setDeliveryConfig({...deliveryConfig, minOrderValue: e.target.value})}
                  disabled={!deliveryConfig.enableMinOrder}
                  className="settings-form-input"
                />
              </div>
            </div>
          </div>

          <div className="settings-form-actions">
            <Button 
              type="button" 
              variant="primary" 
              onClick={handleSaveDeliveryConfig}
              disabled={isLoadingDelivery}
            >
              {isLoadingDelivery ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={loadDeliveryFees}
              disabled={isLoadingDelivery}
            >
              Recarregar
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Loyalty & Cashback Tab */}
      {activeTab === 'loyalty' && isAdmin && (
      <>
        <Card>
          <h2 className="settings-section-title">⭐ Programa de Pontos de Lealdade</h2>
          <div className="settings-option">
            <div className="settings-option-header">
              <div>
                <p className="settings-option-title">Ativar Programa de Pontos</p>
                <p className="settings-option-description">
                  Clientes ganham pontos a cada compra que podem ser trocados por descontos
                </p>
              </div>
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  checked={loyaltyConfig.isActive}
                  onChange={(e) => setLoyaltyConfig({...loyaltyConfig, isActive: e.target.checked})}
                  className="settings-toggle-input" 
                  title="Ativar/Desativar programa de pontos" 
                />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
          </div>

          {loyaltyConfig.isActive && (
            <>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Pontos por R$ 1,00</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyConfig.pointsPerReal}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, pointsPerReal: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="1"
                  />
                  <small className="settings-form-hint">Ex: 1 = cliente ganha 1 ponto a cada R$1 gasto</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Compra Mínima para Pontos (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={loyaltyConfig.minPurchaseForPoints}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, minPurchaseForPoints: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Validade dos Pontos (dias)</label>
                  <input
                    type="number"
                    value={loyaltyConfig.pointsExpirationDays}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, pointsExpirationDays: parseInt(e.target.value) || 365})}
                    className="settings-form-input"
                    placeholder="365"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Pontos Mínimos para Resgatar</label>
                  <input
                    type="number"
                    value={loyaltyConfig.minPointsToRedeem}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, minPointsToRedeem: parseInt(e.target.value) || 100})}
                    className="settings-form-input"
                    placeholder="100"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Valor de Cada Ponto (R$)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={loyaltyConfig.pointsRedemptionValue}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, pointsRedemptionValue: parseFloat(e.target.value) || 0.01})}
                    className="settings-form-input"
                    placeholder="0.01"
                  />
                  <small className="settings-form-hint">Ex: 0.01 = cada ponto vale R$0,01</small>
                </div>
              </div>

              <div className="settings-option">
                <label className="settings-checkbox-option">
                  <input 
                    type="checkbox" 
                    checked={loyaltyConfig.applyToAllProducts}
                    onChange={(e) => setLoyaltyConfig({...loyaltyConfig, applyToAllProducts: e.target.checked})}
                  />
                  <span>Aplicar a todos os produtos</span>
                </label>
                <p className="settings-option-description">
                  {loyaltyConfig.applyToAllProducts 
                    ? 'Todas as vendas geram pontos. Desmarque para escolher produtos específicos no cadastro de produtos.'
                    : 'Apenas produtos marcados como "Elegível para Lealdade" geram pontos.'
                  }
                </p>
              </div>

              <div className="settings-form-actions">
                <Button variant="primary" onClick={handleSaveLoyaltyConfig}>
                  Salvar Configurações de Pontos
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="settings-section-title">💰 Programa de Cashback</h2>
          <div className="settings-option">
            <div className="settings-option-header">
              <div>
                <p className="settings-option-title">Ativar Cashback</p>
                <p className="settings-option-description">
                  Clientes recebem um percentual de volta em dinheiro para usar em próximas compras
                </p>
              </div>
              <label className="settings-toggle">
                <input 
                  type="checkbox" 
                  checked={cashbackConfig.isActive}
                  onChange={(e) => setCashbackConfig({...cashbackConfig, isActive: e.target.checked})}
                  className="settings-toggle-input" 
                  title="Ativar/Desativar cashback" 
                />
                <div className="settings-toggle-slider"></div>
              </label>
            </div>
          </div>

          {cashbackConfig.isActive && (
            <>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Percentual de Cashback (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.cashbackPercentage}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, cashbackPercentage: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="2.00"
                  />
                  <small className="settings-form-hint">Ex: 2 = cliente recebe 2% do valor da compra</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Compra Mínima para Cashback (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.minPurchaseForCashback}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, minPurchaseForCashback: parseFloat(e.target.value) || 0})}
                    className="settings-form-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Cashback Máximo por Compra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.maxCashbackPerPurchase || ''}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, maxCashbackPerPurchase: e.target.value ? parseFloat(e.target.value) : null})}
                    className="settings-form-input"
                    placeholder="Sem limite"
                  />
                  <small className="settings-form-hint">Deixe em branco para sem limite</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Validade do Cashback (dias)</label>
                  <input
                    type="number"
                    value={cashbackConfig.cashbackExpirationDays || ''}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, cashbackExpirationDays: e.target.value ? parseInt(e.target.value) : null})}
                    className="settings-form-input"
                    placeholder="Sem validade"
                  />
                  <small className="settings-form-hint">Deixe em branco para cashback sem validade</small>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Cashback Mínimo para Usar (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashbackConfig.minCashbackToUse}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, minCashbackToUse: parseFloat(e.target.value) || 5})}
                    className="settings-form-input"
                    placeholder="5.00"
                  />
                </div>
              </div>

              <div className="settings-option">
                <label className="settings-checkbox-option">
                  <input 
                    type="checkbox" 
                    checked={cashbackConfig.applyToAllProducts}
                    onChange={(e) => setCashbackConfig({...cashbackConfig, applyToAllProducts: e.target.checked})}
                  />
                  <span>Aplicar a todos os produtos</span>
                </label>
                <p className="settings-option-description">
                  {cashbackConfig.applyToAllProducts 
                    ? 'Todas as vendas geram cashback. Desmarque para escolher produtos específicos no cadastro de produtos.'
                    : 'Apenas produtos marcados como "Gera Cashback" concedem cashback. Você pode definir % específico por produto.'
                  }
                </p>
              </div>

              <div className="settings-form-actions">
                <Button variant="primary" onClick={handleSaveCashbackConfig}>
                  Salvar Configurações de Cashback
                </Button>
              </div>
            </>
          )}
        </Card>
      </>
      )}

      {/* Scale Integration Tab */}
      {activeTab === 'scale' && isAdmin && (
      <Card>
        <h2 className="settings-section-title">⚖️ Integração com Balança</h2>

        <div className="settings-option-item">
          <div>
            <p className="settings-option-title">Ativar leitura de balança</p>
            <p className="settings-option-description">
              Habilita leitura automática no PDV e Comandas (modal de produtos por peso)
            </p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={scaleConfig.isEnabled}
              onChange={(e) => setScaleConfig({ ...scaleConfig, isEnabled: e.target.checked })}
              className="settings-toggle-input"
              title="Ativar balança"
            />
            <div className="settings-toggle-slider"></div>
          </label>
        </div>

        <div className="settings-form-grid settings-scale-form-grid">
          <div className="settings-form-group">
            <label className="settings-form-label">Fabricante</label>
            <select
              className="settings-form-input"
              value={scaleConfig.manufacturer}
              onChange={(e) => {
                const manufacturer = e.target.value as ScaleManufacturer;
                const defaults = getScaleDefaults(manufacturer);
                setScaleConfig({
                  ...scaleConfig,
                  manufacturer,
                  model: defaults.model,
                  protocol: defaults.protocol,
                  baudRate: defaults.baudRate,
                  dataBits: defaults.dataBits,
                  stopBits: defaults.stopBits,
                  parity: defaults.parity,
                  readTimeoutMs: defaults.readTimeoutMs,
                  stableOnly: defaults.stableOnly,
                  requestCommand: defaults.requestCommand,
                });
              }}
              title="Selecionar fabricante"
            >
              <option value="TOLEDO">Toledo</option>
              <option value="URANO">Urano</option>
              <option value="FILIZOLA">Filizola</option>
              <option value="GENERIC">Genérica (Serial)</option>
            </select>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Modelo</label>
            <input
              type="text"
              value={scaleConfig.model || ''}
              onChange={(e) => setScaleConfig({ ...scaleConfig, model: e.target.value })}
              className="settings-form-input"
              placeholder="Ex: PRIX 3 FIT"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Protocolo</label>
            <select
              className="settings-form-input"
              value={scaleConfig.protocol}
              onChange={(e) => setScaleConfig({ ...scaleConfig, protocol: e.target.value as ScaleProtocol })}
              title="Selecionar protocolo"
            >
              <option value="toledo_prix">Toledo PRIX</option>
              <option value="urano">Urano</option>
              <option value="filizola">Filizola</option>
              <option value="generic">Genérico</option>
            </select>
            <small className="settings-form-hint">
              Compatível com Toledo PRIX (foco PRIX 3 FIT), Urano e Filizola.
            </small>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Porta Serial</label>
            {availableScalePorts.length > 0 ? (
              <select
                className="settings-form-input"
                value={scaleConfig.port}
                onChange={(e) => setScaleConfig({ ...scaleConfig, port: e.target.value })}
                title="Selecionar porta USB/Serial"
              >
                {availableScalePorts.map((port) => (
                  <option key={port.path} value={port.path}>
                    {port.path} {port.friendlyName ? `- ${port.friendlyName}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={scaleConfig.port}
                onChange={(e) => setScaleConfig({ ...scaleConfig, port: e.target.value })}
                className="settings-form-input"
                placeholder="COM3"
              />
            )}
            <small className="settings-form-hint">
              Em computadores sem porta serial, o adaptador USB cria uma porta virtual (ex: COM3).
            </small>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Baud rate</label>
            <input
              type="number"
              value={scaleConfig.baudRate}
              onChange={(e) => setScaleConfig({ ...scaleConfig, baudRate: Number(e.target.value) || 9600 })}
              className="settings-form-input"
              placeholder="9600"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Data bits</label>
            <select
              className="settings-form-input"
              value={scaleConfig.dataBits}
              onChange={(e) => setScaleConfig({ ...scaleConfig, dataBits: Number(e.target.value) })}
              title="Selecionar data bits"
            >
              <option value={7}>7</option>
              <option value={8}>8</option>
            </select>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Stop bits</label>
            <select
              className="settings-form-input"
              value={scaleConfig.stopBits}
              onChange={(e) => setScaleConfig({ ...scaleConfig, stopBits: Number(e.target.value) })}
              title="Selecionar stop bits"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Paridade</label>
            <select
              className="settings-form-input"
              value={scaleConfig.parity}
              onChange={(e) => setScaleConfig({ ...scaleConfig, parity: e.target.value as ScaleParity })}
              title="Selecionar paridade"
            >
              <option value="none">Nenhuma</option>
              <option value="even">Par</option>
              <option value="odd">Ímpar</option>
              <option value="mark">Mark</option>
              <option value="space">Space</option>
            </select>
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Timeout de leitura (ms)</label>
            <input
              type="number"
              value={scaleConfig.readTimeoutMs}
              onChange={(e) => setScaleConfig({ ...scaleConfig, readTimeoutMs: Number(e.target.value) || 1500 })}
              className="settings-form-input"
              placeholder="1500"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Comando de leitura (opcional)</label>
            <input
              type="text"
              value={scaleConfig.requestCommand || ''}
              onChange={(e) => setScaleConfig({ ...scaleConfig, requestCommand: e.target.value })}
              className="settings-form-input"
              placeholder="Ex: P\\r\\n"
            />
            <small className="settings-form-hint">Use \r e \n se a balança exigir comando de leitura.</small>
          </div>
        </div>

        <div className="settings-option settings-scale-option">
          <label className="settings-checkbox-option">
            <input
              type="checkbox"
              checked={scaleConfig.stableOnly}
              onChange={(e) => setScaleConfig({ ...scaleConfig, stableOnly: e.target.checked })}
            />
            <span>Ler somente peso estável</span>
          </label>
          <p className="settings-option-description">
            Recomendado para evitar variações durante o manuseio do produto.
          </p>
        </div>

        {availableScalePorts.length === 0 && (
          <div className="settings-scale-diagnostic">
            <p className="settings-scale-diagnostic-title">Nenhuma porta USB/Serial detectada</p>
            <p className="settings-scale-diagnostic-text">
              Verifique o driver do adaptador USB-Serial (FTDI/Prolific/CH340),
              reconecte o cabo e clique em “Atualizar portas”.
            </p>
          </div>
        )}

        {scalePortsWarning && (
          <div className="settings-scale-diagnostic">
            <p className="settings-scale-diagnostic-title">Aviso do servidor</p>
            <p className="settings-scale-diagnostic-text">{scalePortsWarning}</p>
          </div>
        )}

        {scaleTestResult && (
          <div className="settings-scale-test-result">
            {scaleTestResult}
          </div>
        )}

        <div className="settings-form-actions">
          <Button variant="primary" onClick={handleSaveScaleConfig} disabled={isLoadingScale}>
            {isLoadingScale ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          <Button variant="secondary" onClick={loadScalePorts}>
            Atualizar portas
          </Button>
          <Button variant="secondary" onClick={handleTestScale} disabled={isTestingScale}>
            {isTestingScale ? 'Testando...' : 'Testar Leitura'}
          </Button>
        </div>
      </Card>
      )}

      {/* Printer Settings Tab */}
      {activeTab === 'printer' && isAdmin && (
      <Card>
        <h2 className="settings-section-title">🖨️ Configurações de Impressão (80mm)</h2>

        {isLoadingPrinter ? (
          <div className="settings-info-value">Carregando configurações...</div>
        ) : (
          <div className="settings-company-form">
            <div className="settings-form-section">
              <h3 className="settings-form-section-title">Layout e Papel</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Largura do papel</label>
                  <input
                    type="text"
                    value={printerConfig.paperWidth}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, paperWidth: e.target.value })}
                    className="settings-form-input"
                    placeholder="80mm"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Largura do conteúdo</label>
                  <input
                    type="text"
                    value={printerConfig.contentWidth}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, contentWidth: e.target.value })}
                    className="settings-form-input"
                    placeholder="70mm"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Margem (mm)</label>
                  <input
                    type="number"
                    value={printerConfig.marginMm}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, marginMm: Number(e.target.value) || 0 })}
                    className="settings-form-input"
                    placeholder="5"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Máx. caracteres por linha</label>
                  <input
                    type="number"
                    value={printerConfig.maxCharsPerLine}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, maxCharsPerLine: Number(e.target.value) || 42 })}
                    className="settings-form-input"
                    placeholder="42"
                  />
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <h3 className="settings-form-section-title">Tipografia</h3>
              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Fonte</label>
                  <input
                    type="text"
                    value={printerConfig.fontFamily}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, fontFamily: e.target.value })}
                    className="settings-form-input"
                    placeholder="Courier New"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Tamanho da fonte (px)</label>
                  <input
                    type="number"
                    value={printerConfig.fontSize}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, fontSize: Number(e.target.value) || 11 })}
                    className="settings-form-input"
                    placeholder="11"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Altura de linha</label>
                  <input
                    type="number"
                    step="0.1"
                    value={printerConfig.lineHeight}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, lineHeight: Number(e.target.value) || 1.4 })}
                    className="settings-form-input"
                    placeholder="1.4"
                  />
                </div>
              </div>
            </div>

            <div className="settings-form-section">
              <h3 className="settings-form-section-title">Cabeçalho e Rodapé</h3>
              <div className="settings-option">
                <div className="settings-option-header">
                  <div>
                    <p className="settings-option-title">Exibir logo</p>
                    <p className="settings-option-description">Mostra o logo da empresa no cabeçalho do cupom</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={printerConfig.showLogo}
                      onChange={(e) => setPrinterConfig({ ...printerConfig, showLogo: e.target.checked })}
                      className="settings-toggle-input"
                      title="Exibir logo"
                    />
                    <div className="settings-toggle-slider"></div>
                  </label>
                </div>
              </div>

              <div className="settings-option">
                <div className="settings-option-header">
                  <div>
                    <p className="settings-option-title">Exibir dados da empresa</p>
                    <p className="settings-option-description">Mostra nome e telefone no cabeçalho</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={printerConfig.showCompanyInfo}
                      onChange={(e) => setPrinterConfig({ ...printerConfig, showCompanyInfo: e.target.checked })}
                      className="settings-toggle-input"
                      title="Exibir dados da empresa"
                    />
                    <div className="settings-toggle-slider"></div>
                  </label>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-form-group">
                  <label className="settings-form-label">Texto do rodapé</label>
                  <input
                    type="text"
                    value={printerConfig.footerText}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, footerText: e.target.value })}
                    className="settings-form-input"
                    placeholder="Documento não fiscal"
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Texto secundário</label>
                  <input
                    type="text"
                    value={printerConfig.footerSecondaryText}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, footerSecondaryText: e.target.value })}
                    className="settings-form-input"
                    placeholder="Gelatini © 2026"
                  />
                </div>
              </div>
            </div>

            <div className="settings-form-actions">
              <Button variant="primary" onClick={handleSavePrinterConfig} disabled={isLoadingPrinter}>
                {isLoadingPrinter ? 'Salvando...' : 'Salvar Configurações de Impressão'}
              </Button>
            </div>
          </div>
        )}
      </Card>
      )}
    </div>

    {/* User Modal */}
    <Modal
      isOpen={isUserModalOpen}
      title={isEditingUser ? 'Editar Usuário' : 'Novo Usuário'}
      onClose={handleCloseUserModal}
      footer={
        <div className="modal-footer">
          <Button variant="secondary" onClick={handleCloseUserModal}>
            <X size={18} />
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleUserSubmit}>
            <Check size={18} />
            {isEditingUser ? 'Atualizar' : 'Criar Usuário'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleUserSubmit} className="settings-user-form">
        <div className="settings-form-section">
          <div className="settings-form-group">
            <label className="settings-form-label">Nome Completo *</label>
            <input
              type="text"
              value={userForm.fullName}
              onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              className="settings-form-input"
              required
              placeholder="Nome completo do usuário"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">E-mail *</label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              className="settings-form-input"
              required
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">
              Senha {isEditingUser && '(deixe em branco para manter)'}
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              className="settings-form-input"
              required={!isEditingUser}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-form-label">Função *</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'cashier' })}
              className="settings-form-input"
              required
              title="Selecione a função do usuário"
            >
              <option value="cashier">Caixa</option>
              <option value="admin">Administrador</option>
            </select>
            <div className="settings-form-hint">
              <strong>Caixa:</strong> Abre/fecha caixa, vendas PDV, comandas, delivery, cadastra clientes e imprime comprovantes.
              <br />
              <strong>Administrador:</strong> Acesso total ao sistema sem restrições.
            </div>
          </div>
        </div>
      </form>
    </Modal>
  </>
  );
};
