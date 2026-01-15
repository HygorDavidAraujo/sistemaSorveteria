import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeliveryStore, useCashSessionStore, useProductsStore, useCustomersStore } from '@/store';
import { apiClient } from '@/services/api';
import { Truck, Plus, Minus, Trash2, UserPlus, Printer, MapPin, Clock } from 'lucide-react';
import { CepSearchInput, CepSearchFieldsDisplay } from '@/components/CepSearchInput';
import { printReceipt, formatCurrency, getPrintStyles } from '@/utils/printer';
import { clearCartDraft, loadCartDraft, saveCartDraft } from '@/utils/cartDraft';
import type { Product, Customer } from '@/types';
import type { AddressData } from '@/hooks/useGeolocation';
import './DeliveryPage.css';
import '@/styles/assembledModal.css';
import '@/styles/weightModal.css';

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const DeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Cliente e endereço
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [additionalFee, setAdditionalFee] = useState<number>(0);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [isDistanceLoading, setIsDistanceLoading] = useState<boolean>(false);
  
  // Produto e busca
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightQuantity, setWeightQuantity] = useState('');
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  const [isReadingScale, setIsReadingScale] = useState(false);

  // Montado
  const [isAssembledModalOpen, setIsAssembledModalOpen] = useState(false);
  const [assembledCategoryId, setAssembledCategoryId] = useState<string>('');
  const [assembledSizeId, setAssembledSizeId] = useState<string>('');
  const [assembledFlavorsTotal, setAssembledFlavorsTotal] = useState<string>('1');
  const [assembledSelectedFlavors, setAssembledSelectedFlavors] = useState<Product[]>([]);
  const [assembledSearchTerm, setAssembledSearchTerm] = useState('');
  const [assembledGroupId, setAssembledGroupId] = useState<string>('');
  
  // Modal de novo cliente
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [cepAddressData, setCepAddressData] = useState<AddressData | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpf: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    referencePoint: '',
  });
  
  // Pagamento e checkout
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [payments, setPayments] = useState<Array<{ method: string; amount: number }>>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(30);
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Cupom
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  const toMoneyNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const newGroupId = () => {
    const cryptoAny: any = (globalThis as any).crypto;
    if (cryptoAny?.randomUUID) return cryptoAny.randomUUID();
    return `grp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const getProductCategory = (product: Product) => {
    const cat: any = (product as any)?.category;
    return typeof cat === 'object' ? cat : null;
  };
  
  // Pedidos
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  
  // Pagamentos do pedido ativo
  const [orderPayments, setOrderPayments] = useState<Array<{ method: string; amount: number }>>([]);
  const [currentOrderPaymentAmount, setCurrentOrderPaymentAmount] = useState('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  
  const deliveryStore = useDeliveryStore();
  const { currentSession, loadSession } = useCashSessionStore();
  const { products, loadProducts } = useProductsStore();
  const { customers, loadCustomers } = useCustomersStore();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const draft = loadCartDraft();
    if (!draft || draft.mode !== 'delivery') return;

    if (draft.items.length > 0) {
      deliveryStore.setItems(draft.items);
    }
    setSelectedCustomer(draft.selectedCustomerId ?? '');
    setDiscountValue(Number(draft.discountValue ?? 0));
    setAdditionalFee(Number(draft.additionalFee ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasDraftData =
      deliveryStore.items.length > 0 ||
      !!selectedCustomer ||
      toMoneyNumber(discountValue) > 0 ||
      additionalFee > 0;

    if (!hasDraftData) {
      const existing = loadCartDraft();
      if (existing?.mode === 'delivery') clearCartDraft();
      return;
    }

    saveCartDraft({
      mode: 'delivery',
      items: deliveryStore.items,
      selectedCustomerId: selectedCustomer || undefined,
      discountValue: toMoneyNumber(discountValue),
      additionalFee,
    });
  }, [deliveryStore.items, selectedCustomer, discountValue, additionalFee]);

  const handleSwitchMode = (target: 'pdv' | 'comanda' | 'delivery') => {
    saveCartDraft({
      mode: target,
      items: deliveryStore.items,
      selectedCustomerId: selectedCustomer || undefined,
      discountValue: toMoneyNumber(discountValue),
      additionalFee,
      deliveryFee,
    });

    if (target === 'delivery') navigate('/delivery');
    else if (target === 'comanda') navigate('/comandas');
    else navigate('/sales');
  };

  useEffect(() => {
    console.log('⚡ useEffect[selectedCustomer] disparado. selectedCustomer:', selectedCustomer);
    if (selectedCustomer) {
      loadCustomerAddresses(selectedCustomer);
      calculateDeliveryFee();
    } else {
      setCustomerAddresses([]);
      setSelectedAddress('');
      setDeliveryFee(0);
      setDeliveryDistanceKm(null);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedAddress) {
      calculateDeliveryFee();
    }
  }, [selectedAddress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.querySelector('.delivery-page__customer-search-group');
      if (container && !container.contains(event.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
    };

    if (isCustomerSearchOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isCustomerSearchOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProducts(),
        loadCustomers(),
        loadSession(),
        loadOrders(),
      ]);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSale = () => {
    const hasData =
      deliveryStore.items.length > 0 ||
      !!selectedCustomer ||
      !!selectedAddress ||
      deliveryFee > 0 ||
      toMoneyNumber(discountValue) > 0 ||
      additionalFee > 0 ||
      payments.length > 0 ||
      !!customerNotes.trim() ||
      !!internalNotes.trim();

    if (hasData) {
      const ok = window.confirm('Cancelar venda do Delivery e limpar todos os dados?');
      if (!ok) return;
    }

    deliveryStore.clear();
    setSelectedCustomer('');
    setCustomerSearchTerm('');
    setIsCustomerSearchOpen(false);
    setSelectedAddress('');
    setCustomerAddresses([]);
    setDeliveryFee(0);
    setAdditionalFee(0);
    setDiscountValue(0);
    setEstimatedTime(30);
    setCustomerNotes('');
    setInternalNotes('');

    setPayments([]);
    setPaymentMethod('cash');
    setCurrentPaymentAmount('');
    setIsCheckoutModalOpen(false);

    setProductSearchTerm('');
    setIsWeightModalOpen(false);
    setWeightQuantity('');
    setSelectedWeightProduct(null);

    clearCartDraft();
    setSuccess('Venda cancelada');
    setTimeout(() => setSuccess(null), 2000);
  };

  const loadOrders = async () => {
    try {
      const response = await apiClient.get('/delivery/orders');
      // apiClient.get returns the backend JSON payload directly
      // which is { status: 'success', data: orders }
      setOrders(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    }
  };

  const loadCustomerAddresses = async (customerId: string) => {
    try {
        console.log('🔍 loadCustomerAddresses chamado com customerId:', customerId);
      const response = await apiClient.get(`/customers/${customerId}`);
        console.log('📦 Resposta completa do API:', response);
        console.log('📦 response.data:', response.data);
        console.log('📦 Todos os fields:', Object.keys(response.data));
      
      const customer = response.data; // apiClient.get já retorna response.data do axios
        console.log('👤 Customer extraído:', customer);
        console.log('👤 Endereço do customer:', {
          street: customer.street,
          number: customer.number,
          neighborhood: customer.neighborhood,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
        });

      if (!customer) {
        console.error('Cliente não encontrado');
        setCustomerAddresses([]);
        return;
      }

      const primaryAddress = {
        id: 'primary',
        street: customer.street || '',
        number: customer.number || '',
        complement: customer.complement || '',
        neighborhood: customer.neighborhood || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        referencePoint: customer.referencePoint || '',
        latitude: customer.latitude ?? null,
        longitude: customer.longitude ?? null,
        isDefault: true,
      };
      
        console.log('🏠 Endereço montado:', primaryAddress);

      // Sempre adicionar o endereço, mesmo que incompleto
      // O cliente pode completar os detalhes depois
      const addresses = [primaryAddress];
        console.log('📍 Addresses array:', addresses);

      setCustomerAddresses(addresses);
      if (addresses.length > 0) {
        setSelectedAddress(addresses[0].id);
          console.log('✅ selectedAddress definido como:', addresses[0].id);
      } else {
        setSelectedAddress('');
          console.log('❌ Nenhum endereço encontrado');
      }
    } catch (err) {
      console.error('Erro ao carregar endereços:', err);
      setCustomerAddresses([]);
    }
  };

  const calculateDeliveryFee = async () => {
    if (!selectedAddress) {
      setDeliveryFee(0);
      setDeliveryDistanceKm(null);
      return;
    }

    try {
      const address = customerAddresses.find(a => a.id === selectedAddress);
      if (!address) return;

      setIsDistanceLoading(true);

      // Prefer distance-based calculation (store origin -> customer destination)
      // 1) Load company coordinates
      const companyRes = await apiClient.get('/settings/company-info');
      const company = companyRes?.data;
      let originLat = company?.latitude;
      let originLon = company?.longitude;

      // 2) Load default distance fee config (feeType=distance, neighborhood/city null)
      const feesRes = await apiClient.get('/delivery/fees', { params: { feeType: 'distance', isActive: 'true' } });
      const fees = feesRes?.data || [];
      const defaultDistanceFee = fees.find((f: any) => !f.neighborhood && !f.city) || fees[0];

      let destLat = (address as any).latitude;
      let destLon = (address as any).longitude;

      // If we don't have coordinates yet, try fetching them via CEP
      if (
        (typeof originLat !== 'number' || typeof originLon !== 'number') &&
        company?.zipCode
      ) {
        const cepRes = await apiClient.post('/geolocation/search-cep', {
          cep: String(company.zipCode).replace(/\D/g, ''),
        });
        originLat = cepRes?.data?.latitude ?? originLat;
        originLon = cepRes?.data?.longitude ?? originLon;
      }

      if (
        (typeof destLat !== 'number' || typeof destLon !== 'number') &&
        (address as any).zipCode
      ) {
        const cepRes = await apiClient.post('/geolocation/search-cep', {
          cep: String((address as any).zipCode).replace(/\D/g, ''),
        });
        destLat = cepRes?.data?.latitude ?? destLat;
        destLon = cepRes?.data?.longitude ?? destLon;
      }

      if (
        typeof originLat === 'number' &&
        typeof originLon === 'number' &&
        typeof destLat === 'number' &&
        typeof destLon === 'number' &&
        defaultDistanceFee?.feeType === 'distance'
      ) {
        const baseFee = Number(defaultDistanceFee.baseFee ?? defaultDistanceFee.fee ?? 0);
        const feePerKm = Number(defaultDistanceFee.feePerKm ?? 0);
        // maxDistance aqui é o "até X km cobra só a base" (ex.: 1)
        const freeDistanceKm = Number(defaultDistanceFee.maxDistance ?? 1);

        const distRes = await apiClient.post('/geolocation/calculate-distance', {
          lat1: originLat,
          lon1: originLon,
          lat2: destLat,
          lon2: destLon,
        });

        const distanceKm = Number(distRes?.data?.distanceKm ?? 0);
        setDeliveryDistanceKm(Number.isFinite(distanceKm) ? distanceKm : null);

        const feeRes = await apiClient.post('/geolocation/calculate-delivery-fee', {
          distanceKm,
          baseFee,
          feePerKm,
          freeDistanceKm,
        });

        setDeliveryFee(Number(feeRes?.data?.calculatedFee ?? 0));
        return;
      }

      // Even if fee falls back to neighborhood, still try to compute distance (if coords exist)
      if (
        typeof originLat === 'number' &&
        typeof originLon === 'number' &&
        typeof destLat === 'number' &&
        typeof destLon === 'number'
      ) {
        const distRes = await apiClient.post('/geolocation/calculate-distance', {
          lat1: originLat,
          lon1: originLon,
          lat2: destLat,
          lon2: destLon,
        });
        const distanceKm = Number(distRes?.data?.distanceKm ?? 0);
        setDeliveryDistanceKm(Number.isFinite(distanceKm) ? distanceKm : null);
      } else {
        setDeliveryDistanceKm(null);
      }

      // Fallback: neighborhood-based fee
      if (!address.neighborhood || !address.city) {
        setDeliveryFee(0);
        return;
      }

      const response = await apiClient.post('/delivery/calculate-fee', {
        neighborhood: address.neighborhood,
        city: address.city,
        subtotal: subtotal,
      });

      setDeliveryFee(response.data.fee || 0);
    } catch (err) {
      console.error('Erro ao calcular taxa:', err);
      setDeliveryFee(5.00); // Taxa padrão
      setDeliveryDistanceKm(null);
    }
    finally {
      setIsDistanceLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    
    const search = productSearchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(search) ||
        p.code?.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
    );
  }, [products, productSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];

    const search = customerSearchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.cpf?.toLowerCase().includes(search) ||
        c.whatsapp?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [customers, customerSearchTerm]);

  const selectedCustomerData = useMemo(
    () => customers.find((c) => c.id === selectedCustomer),
    [customers, selectedCustomer]
  );

  const selectedAddressData = useMemo(
    () => customerAddresses.find((a) => a.id === selectedAddress),
    [customerAddresses, selectedAddress]
  );

  const formattedDeliveryAddress = useMemo(() => {
    const source = selectedAddressData || {
      street: selectedCustomerData?.street,
      number: selectedCustomerData?.number,
      complement: selectedCustomerData?.complement,
      neighborhood: selectedCustomerData?.neighborhood,
      city: selectedCustomerData?.city,
      state: selectedCustomerData?.state,
      zipCode: selectedCustomerData?.zipCode,
    };

    const parts = [
      source?.street,
      source?.number,
      source?.complement,
      source?.neighborhood,
      source?.zipCode,
      source?.city,
      source?.state,
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : 'Nenhum endereço cadastrado';
  }, [selectedAddressData, selectedCustomerData]);

  const handleAddItem = (product: Product) => {
    if (product.saleType === 'weight') {
      setSelectedWeightProduct(product);
      setWeightQuantity('');
      setIsWeightModalOpen(true);
      return;
    }

    const category = getProductCategory(product);
    const isAssembled = category?.categoryType === 'assembled';
    if (isAssembled) {
      const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
      if (sizes.length === 0) {
        setError('Categoria Montado sem tamanhos cadastrados');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setAssembledCategoryId(String(category.id));
      setAssembledSizeId(String(sizes[0].id));
      setAssembledFlavorsTotal('1');
      setAssembledSelectedFlavors([product]);
      setAssembledSearchTerm('');
      setAssembledGroupId(newGroupId());
      setIsAssembledModalOpen(true);
      return;
    }

    const price = typeof product.salePrice === 'number' 
      ? product.salePrice 
      : parseFloat(product.salePrice as string) || 0;
    
    deliveryStore.addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      saleType: product.saleType,
    });
  };

  const assembledSize = useMemo(() => {
    const anyProduct = assembledSelectedFlavors[0];
    const category = anyProduct ? getProductCategory(anyProduct) : null;
    const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
    return sizes.find((s: any) => String(s.id) === String(assembledSizeId)) || null;
  }, [assembledSelectedFlavors, assembledSizeId]);

  const assembledMaxFlavors = assembledSize?.maxFlavors ? Number(assembledSize.maxFlavors) : 1;
  const assembledFlavorsTotalNumber = Math.max(1, Math.min(assembledMaxFlavors, parseInt(assembledFlavorsTotal || '1', 10) || 1));

  // Reset pagamentos do pedido quando modal fecha
  useEffect(() => {
    if (!isOrderDetailsOpen) {
      setOrderPayments([]);
      setCurrentOrderPaymentAmount('');
      setOrderPaymentMethod('cash');
    }
  }, [isOrderDetailsOpen]);

  useEffect(() => {
    if (!isAssembledModalOpen) return;
    const next = String(assembledFlavorsTotalNumber);
    if (next !== assembledFlavorsTotal) setAssembledFlavorsTotal(next);
  }, [isAssembledModalOpen, assembledFlavorsTotalNumber, assembledFlavorsTotal]);

  const assembledAvailableFlavors = useMemo(() => {
    if (!assembledCategoryId) return [];
    const term = assembledSearchTerm.trim().toLowerCase();
    return products
      .filter((p) => {
        const cat: any = getProductCategory(p);
        if (!cat) return false;
        if (String(cat.id) !== String(assembledCategoryId)) return false;
        if ((p as any).isActive === false) return false;
        if (!term) return true;
        return (p.name || '').toLowerCase().includes(term);
      })
      .slice(0, 20);
  }, [products, assembledCategoryId, assembledSearchTerm]);

  const addAssembledFlavor = (product: Product) => {
    if (assembledSelectedFlavors.length >= assembledFlavorsTotalNumber) return;
    setAssembledSelectedFlavors((prev) => [...prev, product]);
  };

  const removeAssembledFlavor = (index: number) => {
    setAssembledSelectedFlavors((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmAssembled = () => {
    try {
      const sizeId = String(assembledSizeId);
      if (!sizeId) throw new Error('Selecione um tamanho');
      if (!assembledSize) throw new Error('Tamanho inválido');

      const flavorsTotal = assembledFlavorsTotalNumber;
      if (assembledSelectedFlavors.length !== flavorsTotal) {
        throw new Error(`Selecione ${flavorsTotal} sabor(es)`);
      }

      const sizeLabel = String(assembledSize.name || '').trim();

      assembledSelectedFlavors.forEach((p, idx) => {
        const sizePrice = Array.isArray((p as any).sizePrices)
          ? (p as any).sizePrices.find((sp: any) => String(sp.categorySizeId) === sizeId)
          : null;

        if (!sizePrice) {
          throw new Error(`Produto ${p.name} sem preço para o tamanho ${sizeLabel}`);
        }

        const fullPrice = toMoneyNumber(sizePrice.price);
        const unitPrice = flavorsTotal > 1 ? fullPrice / flavorsTotal : fullPrice;

        deliveryStore.addItem({
          id: `${p.id}-${assembledGroupId}-${idx}-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
          saleType: p.saleType,
          sizeId,
          flavorsTotal,
          assembledGroupId,
          assembledSizeLabel: sizeLabel,
        });
      });

      setIsAssembledModalOpen(false);
      setAssembledSelectedFlavors([]);
      setAssembledSearchTerm('');
      setAssembledSizeId('');
      setAssembledCategoryId('');
      setAssembledGroupId('');
    } catch (e: any) {
      setError(e?.message || 'Erro ao montar item');
      setTimeout(() => setError(null), 3000);
    }
  };

  const groupedCartItems = useMemo(() => {
    type Group = {
      kind: 'group';
      groupId: string;
      sizeLabel: string;
      flavorsTotal: number;
      items: any[];
      totalPrice: number;
    };

    type Single = { kind: 'item'; item: any };

    const result: Array<Group | Single> = [];
    const groups = new Map<string, Group>();

    for (const item of deliveryStore.items as any[]) {
      const groupId = item?.assembledGroupId ? String(item.assembledGroupId) : '';
      const flavorsTotal = Number(item?.flavorsTotal ?? 0);
      const shouldGroup = Boolean(item?.sizeId) && Boolean(groupId) && flavorsTotal > 1;

      if (!shouldGroup) {
        result.push({ kind: 'item', item });
        continue;
      }

      let g = groups.get(groupId);
      if (!g) {
        g = {
          kind: 'group',
          groupId,
          sizeLabel: String(item?.assembledSizeLabel || ''),
          flavorsTotal,
          items: [],
          totalPrice: 0,
        };
        groups.set(groupId, g);
        result.push(g);
      }

      g.items.push(item);
      const lineTotal =
        typeof item?.totalPrice === 'number'
          ? item.totalPrice
          : Number(item?.unitPrice || 0) * Number(item?.quantity || 0);
      g.totalPrice += Number.isFinite(lineTotal) ? lineTotal : 0;
    }

    return result;
  }, [deliveryStore.items]);

  const handleConfirmWeight = () => {
    if (!selectedWeightProduct) return;

    const raw = weightQuantity
      .replace(/[^\d,]/g, '')
      .replace(/,(?=.*,)/g, '')
      .replace(',', '.');
    const quantity = parseFloat(raw);

    if (Number.isNaN(quantity) || quantity <= 0) {
      setError('Quantidade deve ser maior que 0');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const price = typeof selectedWeightProduct.salePrice === 'number' 
      ? selectedWeightProduct.salePrice 
      : parseFloat(selectedWeightProduct.salePrice as string) || 0;
    
    const totalPrice = quantity * price;
    
    deliveryStore.addItem({
      id: `${selectedWeightProduct.id}-${Date.now()}`,
      productId: selectedWeightProduct.id,
      productName: selectedWeightProduct.name,
      quantity: quantity,
      unitPrice: price,
      totalPrice: totalPrice,
      saleType: selectedWeightProduct.saleType,
    });

    setSuccess(`${selectedWeightProduct.name} adicionado ao carrinho!`);
    setTimeout(() => setSuccess(null), 2000);
    
    setIsWeightModalOpen(false);
    setSelectedWeightProduct(null);
    setWeightQuantity('');
  };

  const readWeightFromScale = async () => {
    if (isReadingScale) return;
    setIsReadingScale(true);
    try {
      const data = await apiClient.get('/scale/weight');
      const weightKg = Number((data as any)?.weightKg);
      if (!Number.isFinite(weightKg) || weightKg <= 0) {
        throw new Error('Peso inválido retornado pela balança');
      }
      setWeightQuantity(weightKg.toFixed(3).replace('.', ','));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao ler peso da balança');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsReadingScale(false);
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      deliveryStore.updateItem(itemId, quantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    deliveryStore.removeItem(itemId);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/customers', customerForm);
      // apiClient.post already returns response.data
      const newCustomer = response.data || response;
      
      await loadCustomers();
      setSelectedCustomer(newCustomer.id);
      await loadCustomerAddresses(newCustomer.id);
      setCustomerSearchTerm('');
      setIsCustomerSearchOpen(false);
      setIsNewCustomerModalOpen(false);
      setSuccess('Cliente cadastrado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      setCustomerForm({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        cpf: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        referencePoint: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar cliente');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Digite um código de cupom');
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (!selectedCustomer) {
      setError('Selecione um cliente para aplicar o cupom');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsCouponLoading(true);
    try {
      const response = await apiClient.validateCoupon(couponCode.trim(), subtotal, selectedCustomer);
      const validatedCoupon = response.data || response;
      
      setAppliedCoupon(validatedCoupon);
      setCouponDiscount(validatedCoupon.discountAmount || 0);
      setSuccess(`Cupom ${couponCode} aplicado com sucesso!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      let errorMsg = 'Erro ao validar cupom';
      if (err?.response?.status === 404) {
        errorMsg = 'Cupom não encontrado';
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setSuccess('Cupom removido');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleCepAddressFound = (address: AddressData) => {
    setCepAddressData(address);
    setCustomerForm(prev => ({
      ...prev,
      zipCode: address.cep,
      street: address.logradouro,
      neighborhood: address.bairro,
      city: address.cidade,
      state: address.estado,
    }));
  };

  const handleCepClear = () => {
    setCepAddressData(null);
    setCustomerForm(prev => ({
      ...prev,
      zipCode: '',
    }));
  };

  const handleAddPayment = () => {
    const amount = round2(parseFloat(currentPaymentAmount));
    if (isNaN(amount) || amount <= 0) {
      setError('Digite um valor válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPayments([...payments, { method: paymentMethod, amount }]);
    setCurrentPaymentAmount('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleAddOrderPayment = () => {
    const amount = round2(parseFloat(currentOrderPaymentAmount));
    if (isNaN(amount) || amount <= 0) {
      setError('Digite um valor válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setOrderPayments([...orderPayments, { method: orderPaymentMethod, amount }]);
    setCurrentOrderPaymentAmount('');
  };

  const handleRemoveOrderPayment = (index: number) => {
    setOrderPayments(orderPayments.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    console.log('🧾 Início do checkout');
    console.log('🧑 selectedCustomer:', selectedCustomer);
    console.log('🏠 selectedAddress:', selectedAddress);
    console.log('🛒 items:', deliveryStore.items);
    console.log('💵 payments:', payments);
    console.log('🧮 total calculado:', total);
    if (!currentSession || currentSession.status !== 'open') {
      setError('Nenhum caixa aberto. Abra um caixa para continuar.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (deliveryStore.items.length === 0) {
      setError('Adicione ao menos um item ao pedido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!selectedCustomer) {
      setError('Selecione um cliente para o delivery');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!selectedAddress) {
      setError('Selecione um endereço para entrega');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const totalPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
    console.log('💰 totalPaid:', totalPaid);
    // Se houver pagamentos lançados, valide o total; caso contrário, permita seguir sem pagamento
    if (payments.length > 0 && Math.abs(totalPaid - total) > 0.009) {
      setError(`Valor pago (R$ ${totalPaid.toFixed(2)}) diferente do total (R$ ${total.toFixed(2)})`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Validar se o cliente realmente está selecionado
      if (!selectedCustomer || selectedCustomer.trim() === '') {
        setError('Cliente não selecionado corretamente');
        setTimeout(() => setError(null), 3000);
        return;
      }

      const orderPayments = payments.length > 0
        ? payments.map(p => ({ paymentMethod: p.method as any, amount: p.amount }))
        : undefined;

      const orderData = {
          customerId: selectedCustomer,
          cashSessionId: currentSession.id,
          items: deliveryStore.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.sizeId ? { sizeId: item.sizeId, flavorsTotal: item.flavorsTotal ?? 1 } : {}),
          })),
          ...(orderPayments ? { payments: orderPayments } : {}),
          deliveryFee,
          additionalFee,
          discount: discountValueNum + couponDiscount,
          estimatedTime,
          customerNotes: customerNotes || undefined,
          internalNotes: internalNotes || undefined,
        };

      console.log('🚚 Enviando pedido payload:', orderData);
      const resp = await apiClient.post('/delivery/orders', orderData);
      console.log('✅ Pedido criado:', resp);
      
      setSuccess('Pedido criado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Limpar carrinho e formulário
      deliveryStore.clear();
      clearCartDraft();
      setPayments([]);
      setDiscountValue(0);
      setAdditionalFee(0);
      setCustomerNotes('');
      setInternalNotes('');
      setSelectedCustomer('');
      setSelectedAddress('');
      setIsCheckoutModalOpen(false);
      
      await loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar pedido');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.put(`/delivery/orders/${orderId}/status`, { status });
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
      await loadOrders();
      
      if (selectedOrder?.id === orderId) {
        const updated = orders.find(o => o.id === orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar status');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handlePrintOrder = (order: any) => {
    const address = {
      street: order.customer?.street,
      number: order.customer?.number,
      complement: order.customer?.complement,
      neighborhood: order.customer?.neighborhood,
      city: order.customer?.city,
      state: order.customer?.state,
      zipCode: order.customer?.zipCode,
      referencePoint: order.customer?.referencePoint,
    };

    const itemsHTML = (order.items || []).map((item: any) => `
      <tr>
        <td class="print-table-item-name">${item.productName}</td>
        <td class="print-table-col-qty">${item.quantity}</td>
        <td class="print-table-col-total">R$ ${parseFloat(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const addressText = `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}
${address.neighborhood} - ${address.city}/${address.state}
CEP: ${address.zipCode || 'N/A'}${address.referencePoint ? ` | Ref: ${address.referencePoint}` : ''}`;

    const content = `
      <div class="print-header">
        <div class="print-header-title">🚚 DELIVERY</div>
        <div class="print-header-info" style="text-align: center; margin-top: 6px;">Pedido #${order.orderNumber}</div>
        <div class="print-header-info" style="text-align: center; margin-top: 4px;">Data: ${new Date(order.orderedAt).toLocaleString('pt-BR')}</div>
      </div>

      <div class="print-section">
        <div class="print-section-title">Dados do Cliente</div>
        <div class="print-row">
          <span class="print-row-label"><strong>${order.customer?.name || 'N/A'}</strong></span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Telefone: ${order.customer?.phone || 'N/A'}</span>
        </div>
      </div>

      <div class="print-section">
        <div class="print-section-title">📍 Endereço de Entrega</div>
        <div style="font-size: 10px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
${addressText}
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="print-table-col-qty">Qtd</th>
            <th class="print-table-col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="print-totals">
        <div class="print-row">
          <span class="print-row-label">Subtotal:</span>
          <span class="print-row-value">${formatCurrency(parseFloat(order.subtotal))}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Taxa de Entrega:</span>
          <span class="print-row-value">${formatCurrency(parseFloat(order.deliveryFee))}</span>
        </div>
        ${parseFloat((order as any).additionalFee || 0) > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Acréscimo:</span>
            <span class="print-row-value">${formatCurrency(parseFloat((order as any).additionalFee))}</span>
          </div>
        ` : ''}
        ${parseFloat(order.discount) > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(parseFloat(order.discount))}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(parseFloat(order.total))}</span>
        </div>
      </div>

      ${order.customerNotes ? `
        <div class="print-section">
          <div class="print-section-title">📝 Observações do Cliente</div>
          <div style="font-size: 10px;">${order.customerNotes}</div>
        </div>
      ` : ''}

      ${order.internalNotes ? `
        <div class="print-section">
          <div class="print-section-title">📝 Observações Internas</div>
          <div style="font-size: 10px;">${order.internalNotes}</div>
        </div>
      ` : ''}

      ${order.payments && order.payments.length > 0 ? `
        <div class="print-section">
          <div class="print-section-title">💳 Formas de Pagamento</div>
          ${order.payments.map((p: any) => `
            <div class="print-row" style="font-size: 10px;">
              <span class="print-row-label">${p.paymentMethod === 'cash' ? 'Dinheiro' : p.paymentMethod === 'credit_card' ? 'Cartão de Crédito' : p.paymentMethod === 'debit_card' ? 'Cartão de Débito' : p.paymentMethod === 'pix' ? 'PIX' : 'Outro'}:</span>
              <span class="print-row-value">R$ ${parseFloat(p.amount || 0).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="print-section" style="margin-top: 8mm;">
        <div class="print-row" style="font-size: 10px;">
          <span>⏱️ Tempo estimado: ${order.estimatedTime || 30} minutos</span>
        </div>
      </div>

      <div class="print-footer">
        <div class="print-footer-text">Obrigado pela preferência!</div>
        <div class="print-footer-line">Gelatini © 2024</div>
      </div>
    `;

    printReceipt({
      title: 'Pedido Delivery #' + order.orderNumber,
      content
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      received: 'Recebido',
      preparing: 'Preparando',
      out_for_delivery: 'Saiu para Entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      received: '#3b82f6',
      preparing: '#f59e0b',
      out_for_delivery: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const rawSubtotal = deliveryStore.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const subtotal = round2(rawSubtotal);
  const discountValueNum = toMoneyNumber(discountValue);
  const total = round2(subtotal + deliveryFee + additionalFee - discountValueNum - couponDiscount);
  const totalPaid = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const missingAmount = round2(Math.max(0, total - totalPaid));
  const changeAmount = round2(Math.max(0, totalPaid - total));

  console.log('🔘 Render - selectedCustomer:', selectedCustomer);
  console.log('🔘 Render - selectedAddress:', selectedAddress);
  console.log('🔘 Render - botão disabled?', !selectedCustomer || !selectedAddress);

  if (loading) return <div className="delivery-page__loading">Carregando...</div>;

  return (
    <div className="delivery-page">
      <div className="delivery-page__header">
        <Truck size={32} />
        <h1 className="delivery-page__title">Sistema de Delivery</h1>
      </div>

      {error && (
        <div className="delivery-page__alert delivery-page__alert--danger">
          {error}
          <button onClick={() => setError(null)} className="delivery-page__alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="delivery-page__alert delivery-page__alert--success">
          {success}
          <button onClick={() => setSuccess(null)} className="delivery-page__alert-close">✕</button>
        </div>
      )}

      <div className="delivery-page__grid">
        {/* Produtos */}
        <div className="delivery-page__products">
          <div className="delivery-page__products-header">
            <h2>Produtos</h2>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              className="delivery-page__search-input"
            />
          </div>
          <div className="delivery-page__products-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="delivery-page__product-card"
                onClick={() => handleAddItem(product)}
              >
                <div className="delivery-page__product-image">
                  {product.image ? <img src={product.image} alt={product.name} /> : '🍦'}
                </div>
                <p className="delivery-page__product-name">{product.name}</p>
                <p className="delivery-page__product-price">
                  R$ {(typeof product.salePrice === 'number' ? product.salePrice : parseFloat(product.salePrice as string) || 0).toFixed(2)}
                  {product.saleType === 'weight' ? '/kg' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Carrinho */}
        <div className="delivery-page__cart">
          <div className="delivery-page__cart-title-row">
            <h2>Carrinho</h2>
            <div className="delivery-page__cart-title-actions">
              <select
                title="Trocar módulo mantendo itens"
                value="delivery"
                onChange={(e) => handleSwitchMode(e.target.value as any)}
                className="delivery-page__cart-mode-select"
              >
                <option value="pdv">PDV</option>
                <option value="comanda">Comanda</option>
                <option value="delivery">Delivery</option>
              </select>
              <button
                type="button"
                onClick={handleCancelSale}
                className="delivery-page__cart-cancel-sale-btn"
                title="Cancelar venda e limpar tudo"
              >
                Cancelar venda
              </button>
            </div>
          </div>
          
          <div className="delivery-page__cart-items">
            {groupedCartItems.map((entry) => {
              if (entry.kind === 'group') {
                const title = `Montado${entry.sizeLabel ? ` - ${entry.sizeLabel}` : ''} (${entry.flavorsTotal} sabor(es))`;
                return (
                  <div key={`group-${entry.groupId}`} className="delivery-page__cart-item">
                    <div className="delivery-page__cart-item-info" style={{ alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                        <span className="delivery-page__cart-item-name">{title}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {entry.items.map((it) => (
                            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                              <span>
                                {it.productName}
                                {it.quantity > 1 ? ` x${it.quantity}` : ''}
                              </span>
                              <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                                R$ {(Number(it.unitPrice || 0) * Number(it.quantity || 0)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="delivery-page__cart-item-actions">
                      <button
                        onClick={() => entry.items.forEach((it) => handleRemoveItem(it.id))}
                        className="delivery-page__cart-item-btn delivery-page__cart-item-btn--remove"
                        title="Remover item montado"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="delivery-page__cart-item-total">R$ {entry.totalPrice.toFixed(2)}</div>
                  </div>
                );
              }

              const item = entry.item;
              return (
                <div key={item.id} className="delivery-page__cart-item">
                  <div className="delivery-page__cart-item-info">
                    <span className="delivery-page__cart-item-name">{item.productName}</span>
                    <span className="delivery-page__cart-item-price">
                      R$ {item.unitPrice.toFixed(2)}{item.saleType === 'weight' ? '/kg' : ''}
                    </span>
                  </div>
                  <div className="delivery-page__cart-item-actions">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - (item.saleType === 'weight' ? 0.1 : 1))}
                          className="delivery-page__cart-item-btn"
                          title="Diminuir quantidade"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="delivery-page__cart-item-qty">
                          {item.saleType === 'weight' ? item.quantity.toFixed(3) : item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + (item.saleType === 'weight' ? 0.1 : 1))}
                          className="delivery-page__cart-item-btn"
                          title="Aumentar quantidade"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="delivery-page__cart-item-btn delivery-page__cart-item-btn--remove"
                          title="Remover item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="delivery-page__cart-item-total">R$ {item.totalPrice.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="delivery-page__cart-customer">
                <label>
                  <span>Cliente:</span>
                  <div className="delivery-page__customer-search-group">
                    {selectedCustomerData && (
                      <div className="delivery-page__customer-selected">
                        <div className="delivery-page__customer-selected-name">{selectedCustomerData.name}</div>
                        <div className="delivery-page__customer-selected-info">
                          {selectedCustomerData.cpf || selectedCustomerData.phone || selectedCustomerData.whatsapp || selectedCustomerData.email || 'Dados não informados'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCustomer('');
                            setSelectedAddress('');
                            setCustomerSearchTerm('');
                          }}
                          className="delivery-page__customer-remove"
                          title="Remover cliente"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="delivery-page__customer-search-input-wrapper">
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        placeholder="Buscar cliente por nome, CPF ou telefone..."
                        className="delivery-page__customer-search-input"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="delivery-page__customer-add-button"
                        title="Cadastrar novo cliente"
                      >
                        <UserPlus size={18} />
                      </button>

                      {isCustomerSearchOpen && (
                        <div className="delivery-page__customer-search-results">
                          {filteredCustomers.length > 0 ? (
                            <>
                              {filteredCustomers.map((customer) => (
                                <button
                                  key={customer.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    console.log('🎯 Cliente selecionado:', customer.id, customer.name);
                                    setSelectedCustomer(customer.id);
                                    setSelectedAddress('');
                                    setCustomerSearchTerm('');
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className="delivery-page__customer-search-item"
                                >
                                  <span className="delivery-page__customer-search-item-name">{customer.name}</span>
                                  <span className="delivery-page__customer-search-item-info">{customer.cpf || customer.phone || customer.whatsapp || customer.email}</span>
                                </button>
                              ))}
                            </>
                          ) : customerSearchTerm ? (
                            <div className="delivery-page__customer-search-empty">Nenhum cliente encontrado</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {selectedCustomer && (
                  <label>
                    <span>Endereço de Entrega:</span>
                    {customerAddresses.length > 0 ? (
                      <select
                        value={selectedAddress}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                        className="delivery-page__select"
                      >
                        <option value="">Selecione um endereço</option>
                        {customerAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.street}, {addr.number} - {addr.neighborhood}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="delivery-page__address-warning">
                        ⚠️ Cliente não possui endereço. Cadastre um endereço primeiro.
                      </div>
                    )}
                  </label>
                )}

                {selectedCustomerData && (
                  <div className="delivery-page__delivery-info">
                    <h4>Informações para Entrega</h4>
                    <p><strong>Nome Completo:</strong> {selectedCustomerData.name || 'Não informado'}</p>
                    <p><strong>Telefone:</strong> {selectedCustomerData.phone || selectedCustomerData.whatsapp || 'Não informado'}</p>
                    <p><strong>Endereço:</strong> {formattedDeliveryAddress}</p>
                  </div>
                )}
              </div>

              <div className="delivery-page__cart-totals">
                <div className="delivery-page__cart-total-row">
                  <span>Acréscimo (R$):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={additionalFee}
                    onChange={(e) => setAdditionalFee(toMoneyNumber(e.target.value))}
                    className="delivery-page__cart-inline-input"
                    placeholder="0,00"
                  />
                </div>
                <div className="delivery-page__cart-total-row">
                  <span>Desconto (R$):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={discountValueNum}
                    onChange={(e) => setDiscountValue(toMoneyNumber(e.target.value))}
                    className="delivery-page__cart-inline-input"
                    placeholder="0,00"
                  />
                </div>
                <div className="delivery-page__cart-total-row">
                  <span>Cupom de Desconto:</span>
                  <div style={{display: 'flex', gap: '8px', flex: 1}}>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="delivery-page__cart-inline-input"
                      placeholder="Digite o código"
                      disabled={!!appliedCoupon || isCouponLoading}
                      style={{flex: 1}}
                    />
                    {appliedCoupon ? (
                      <button
                        onClick={handleRemoveCoupon}
                        className="delivery-page__cart-coupon-btn delivery-page__cart-coupon-btn--remove"
                        title="Remover cupom"
                      >
                        ✕
                      </button>
                    ) : (
                      <button
                        onClick={handleApplyCoupon}
                        className="delivery-page__cart-coupon-btn"
                        disabled={!couponCode.trim() || isCouponLoading}
                        title="Aplicar cupom"
                      >
                        {isCouponLoading ? '...' : 'Aplicar'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="delivery-page__cart-total-row">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="delivery-page__cart-total-row">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="delivery-page__cart-total-row">
                  <span>Distância:</span>
                  <span>
                    {isDistanceLoading
                      ? 'Calculando...'
                      : deliveryDistanceKm === null
                        ? '-'
                        : `${deliveryDistanceKm.toFixed(2)} km`}
                  </span>
                </div>
                {additionalFee > 0 && (
                  <div className="delivery-page__cart-total-row">
                    <span>Acréscimo:</span>
                    <span>R$ {additionalFee.toFixed(2)}</span>
                  </div>
                )}
                {discountValueNum > 0 && (
                  <div className="delivery-page__cart-total-row">
                    <span>Desconto:</span>
                    <span>-R$ {discountValueNum.toFixed(2)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="delivery-page__cart-total-row">
                    <span>Desconto Cupom ({appliedCoupon?.code}):</span>
                    <span>-R$ {couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="delivery-page__cart-total-row delivery-page__cart-total-final">
                  <span>Total:</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="delivery-page__btn-checkout"
                disabled={!selectedCustomer || !selectedAddress}
              >
                Finalizar Pedido
              </button>
        </div>

        {/* Pedidos */}
        <div className="delivery-page__orders">
          <h2>Pedidos Ativos</h2>
          <div className="delivery-page__orders-list">
            {orders.filter(o => o.deliveryStatus !== 'delivered' && o.deliveryStatus !== 'cancelled').map((order) => (
              <div
                key={order.id}
                className="delivery-page__order-card"
                onClick={() => {
                  setSelectedOrder(order);
                  setIsOrderDetailsOpen(true);
                }}
              >
                <div className="delivery-page__order-header">
                  <span className="delivery-page__order-number">Pedido #{order.orderNumber}</span>
                  <span
                    className={`delivery-page__order-status delivery-page__order-status--${order.deliveryStatus}`}
                  >
                    {getStatusLabel(order.deliveryStatus)}
                  </span>
                </div>
                <div className="delivery-page__order-info">
                  <p><strong>{order.customer?.name}</strong></p>
                  <p className="delivery-page__order-time">
                    <Clock size={14} />
                    {new Date(order.orderedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="delivery-page__order-total">R$ {parseFloat(order.total).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Peso */}
      {isAssembledModalOpen && (
        <div className="assembled-modal-overlay">
          <div className="assembled-modal assembled-modal--large">
            <h3>Montar produto</h3>

            <div className="assembled-form-grid">
              <div>
                <label className="assembled-label">Tamanho</label>
                <select
                  value={assembledSizeId}
                  onChange={(e) => setAssembledSizeId(e.target.value)}
                  className="assembled-input"
                  title="Tamanho"
                >
                  {(() => {
                    const anyProduct = assembledSelectedFlavors[0];
                    const category = anyProduct ? getProductCategory(anyProduct) : null;
                    const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
                    return sizes.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="assembled-label">Sabores</label>
                <div className="assembled-radio-group" role="radiogroup" aria-label="Quantidade de sabores">
                  {Array.from({ length: Math.max(1, assembledMaxFlavors) }, (_, i) => i + 1).map((n) => (
                    <label
                      key={n}
                      className={`assembled-radio-option ${assembledFlavorsTotalNumber === n ? 'assembled-radio-option--checked' : ''}`}
                    >
                      <input
                        type="radio"
                        name="assembledFlavorsTotal"
                        value={n}
                        checked={assembledFlavorsTotalNumber === n}
                        onChange={() => setAssembledFlavorsTotal(String(n))}
                      />
                      <span>{n} sabor{n > 1 ? 'es' : ''}</span>
                    </label>
                  ))}
                </div>
                <small style={{ color: 'rgba(0,0,0,0.6)' }}>Máx: {assembledMaxFlavors}</small>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="assembled-label">Sabores selecionados</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {assembledSelectedFlavors.map((p, idx) => (
                  <div key={`${p.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      {p.name}
                      <span style={{ color: 'rgba(0,0,0,0.6)' }}> #{idx + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAssembledFlavor(idx)}
                      className="assembled-btn-cancel"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <div style={{ color: 'rgba(0,0,0,0.6)' }}>
                  {assembledSelectedFlavors.length}/{assembledFlavorsTotalNumber}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="assembled-label">Adicionar sabor</label>
              <input
                type="text"
                value={assembledSearchTerm}
                onChange={(e) => setAssembledSearchTerm(e.target.value)}
                placeholder="Buscar sabor..."
                className="assembled-input"
                title="Buscar sabor"
              />
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {assembledAvailableFlavors.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addAssembledFlavor(p)}
                    disabled={assembledSelectedFlavors.length >= assembledFlavorsTotalNumber}
                    className="assembled-product-card"
                    style={{ cursor: 'pointer' }}
                    title="Adicionar sabor"
                  >
                    <div className="assembled-product-name">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="assembled-modal-actions">
              <button onClick={() => setIsAssembledModalOpen(false)} className="assembled-btn-cancel">
                Cancelar
              </button>
              <button onClick={confirmAssembled} className="assembled-btn-confirm">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`sales-page__modal ${isWeightModalOpen ? 'sales-page__modal--open' : ''}`}>
        <div className="sales-page__modal-overlay" onClick={() => setIsWeightModalOpen(false)} />
        <div className="sales-page__modal-content sales-page__modal-content--small">
          <div className="sales-page__modal-header">
            <h2 className="sales-page__modal-title">Capturar Peso - {selectedWeightProduct?.name}</h2>
            <button onClick={() => setIsWeightModalOpen(false)} className="sales-page__modal-close">
              ✕
            </button>
          </div>

          <div className="sales-page__modal-body">
            <div className="sales-page__weight-section">
              <label className="sales-page__weight-label">Peso (kg)</label>
              <input
                type="text"
                placeholder="0,000"
                value={weightQuantity}
                onChange={(e) => setWeightQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmWeight();
                  }
                }}
                className="sales-page__weight-input"
                autoFocus
              />
              <p className="sales-page__weight-hint">Digite o peso ou clique em "Ler da Balança"</p>

              <div className="sales-page__weight-actions">
                <button
                  type="button"
                  onClick={readWeightFromScale}
                  disabled={isReadingScale}
                  className="sales-page__weight-button sales-page__weight-button--scale"
                >
                  {isReadingScale ? 'Lendo...' : '📊 Ler da Balança'}
                </button>
              </div>
            </div>
          </div>

          <div className="sales-page__modal-footer">
            <button
              onClick={() => setIsWeightModalOpen(false)}
              className="sales-page__modal-button sales-page__modal-button--cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmWeight}
              className="sales-page__modal-button sales-page__modal-button--confirm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Novo Cliente */}
      {isNewCustomerModalOpen && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal delivery-page__modal--large">
            <h3>Cadastrar Novo Cliente</h3>
            <form onSubmit={handleCreateCustomer} className="delivery-page__customer-form">
              <div className="delivery-page__form-grid">
                <input
                  type="text"
                  placeholder="Nome completo *"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="tel"
                  placeholder="Telefone *"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="WhatsApp"
                  value={customerForm.whatsapp}
                  onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
                  className="delivery-page__input"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  className="delivery-page__input"
                />
              </div>
              <h4>Endereço</h4>
              <div className="delivery-page__form-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <CepSearchInput
                    onAddressFound={handleCepAddressFound}
                    onClear={handleCepClear}
                    onCepChange={(cep) => setCustomerForm((prev) => ({ ...prev, zipCode: cep }))}
                    initialCep={customerForm.zipCode}
                    label="CEP"
                    showCoordinates={false}
                  />
                </div>
                {cepAddressData && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <CepSearchFieldsDisplay address={cepAddressData} showCoordinates={false} />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Rua *"
                  value={customerForm.street}
                  onChange={(e) => setCustomerForm({ ...customerForm, street: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Número *"
                  value={customerForm.number}
                  onChange={(e) => setCustomerForm({ ...customerForm, number: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Complemento"
                  value={customerForm.complement}
                  onChange={(e) => setCustomerForm({ ...customerForm, complement: e.target.value })}
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Bairro *"
                  value={customerForm.neighborhood}
                  onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Cidade *"
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  required
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Estado *"
                  value={customerForm.state}
                  onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                  required
                  maxLength={2}
                  className="delivery-page__input"
                />
                <input
                  type="text"
                  placeholder="Ponto de referência"
                  value={customerForm.referencePoint}
                  onChange={(e) => setCustomerForm({ ...customerForm, referencePoint: e.target.value })}
                  className="delivery-page__input"
                />
              </div>
              <div className="delivery-page__modal-actions">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="delivery-page__btn-cancel"
                >
                  Cancelar
                </button>
                <button type="submit" className="delivery-page__btn-confirm">
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido (Checkout) */}
      {isCheckoutModalOpen && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal delivery-page__modal--large">
            <h3>Detalhes do Pedido</h3>
            
            <div className="delivery-page__checkout-section">
              <h4>Detalhes da Entrega</h4>
              <label>
                <span>Tempo Estimado (min):</span>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
                  className="delivery-page__input"
                />
              </label>
              <label>
                <span>Observações do Cliente:</span>
                <textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Sem cebola, ponto da carne, etc..."
                  className="delivery-page__textarea"
                  rows={2}
                />
              </label>
              <label>
                <span>Observações Internas:</span>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Notas para a cozinha ou entregador..."
                  className="delivery-page__textarea"
                  rows={2}
                />
              </label>
            </div>

            <div className="delivery-page__modal-actions">
              <button onClick={() => setIsCheckoutModalOpen(false)} className="delivery-page__btn-cancel">
                Cancelar
              </button>
              <button
                onClick={handleCheckout}
                className="delivery-page__btn-confirm"
              >
                Confirmar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido */}
      {isOrderDetailsOpen && selectedOrder && (
        <div className="delivery-page__modal-overlay">
          <div className="delivery-page__modal delivery-page__modal--large">
            <h3>Pedido #{selectedOrder.orderNumber}</h3>
            
            <div className="delivery-page__order-details">
              <div className="delivery-page__order-detail-section">
                <h4>Pagamento</h4>
                <div className="delivery-page__payment-form">
                  <select
                    value={orderPaymentMethod}
                    onChange={(e) => setOrderPaymentMethod(e.target.value as any)}
                    className="delivery-page__select"
                    title="Forma de pagamento"
                  >
                    <option value="cash">Dinheiro</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="debit_card">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Valor"
                    value={currentOrderPaymentAmount}
                    onChange={(e) => setCurrentOrderPaymentAmount(e.target.value)}
                    className="delivery-page__input"
                  />
                  <button onClick={handleAddOrderPayment} className="delivery-page__btn-add">
                    Adicionar
                  </button>
                </div>

                {orderPayments.length > 0 && (
                  <div className="delivery-page__payment-list">
                    {orderPayments.map((p, i) => (
                      <div key={i} className="delivery-page__payment-item">
                        <span>{p.method === 'cash' ? 'Dinheiro' : p.method === 'credit_card' ? 'Crédito' : p.method === 'debit_card' ? 'Débito' : 'PIX'}</span>
                        <span>R$ {p.amount.toFixed(2)}</span>
                        <button onClick={() => handleRemoveOrderPayment(i)} className="delivery-page__btn-remove" title="Remover pagamento">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="delivery-page__payment-status">
                  <div>Total: R$ {parseFloat(selectedOrder.total).toFixed(2)}</div>
                  <div>Pago: R$ {round2(orderPayments.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}</div>
                  {round2(Math.max(0, parseFloat(selectedOrder.total) - orderPayments.reduce((sum, p) => sum + p.amount, 0))) > 0 && (
                    <div className="delivery-page__payment-missing">Falta: R$ {round2(Math.max(0, parseFloat(selectedOrder.total) - orderPayments.reduce((sum, p) => sum + p.amount, 0))).toFixed(2)}</div>
                  )}
                  {round2(Math.max(0, orderPayments.reduce((sum, p) => sum + p.amount, 0) - parseFloat(selectedOrder.total))) > 0 && (
                    <div className="delivery-page__payment-change">Troco: R$ {round2(Math.max(0, orderPayments.reduce((sum, p) => sum + p.amount, 0) - parseFloat(selectedOrder.total))).toFixed(2)}</div>
                  )}
                </div>
              </div>

              <div className="delivery-page__order-detail-section">
                <h4>Status Atual</h4>
                <div className="delivery-page__status-buttons">
                  {['received', 'preparing', 'out_for_delivery', 'delivered'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateOrderStatus(selectedOrder.id, status)}
                      className={`delivery-page__status-btn delivery-page__status-btn--${status} ${selectedOrder.deliveryStatus === status ? 'active' : ''}`}
                      title={`Alterar status para ${getStatusLabel(status)}`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="delivery-page__order-detail-section">
                <h4>Endereço de Entrega</h4>
                <div className="delivery-page__order-address">
                  <div>{selectedOrder.customer?.street}, {selectedOrder.customer?.number}{selectedOrder.customer?.complement ? ` - ${selectedOrder.customer?.complement}` : ''}</div>
                  <div>{selectedOrder.customer?.neighborhood} - {selectedOrder.customer?.city}/{selectedOrder.customer?.state}</div>
                  <div>CEP: {selectedOrder.customer?.zipCode || 'N/A'}</div>
                  {selectedOrder.customer?.referencePoint ? (
                    <div>Ref: {selectedOrder.customer?.referencePoint}</div>
                  ) : null}
                </div>
              </div>

              <div className="delivery-page__order-detail-section">
                <h4>Itens do Pedido</h4>
                {(selectedOrder.items || []).map((item: any, i: number) => (
                  <div key={i} className="delivery-page__order-item">
                    <span>{item.quantity}x {item.productName}</span>
                    <span>R$ {parseFloat(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="delivery-page__order-detail-section">
                <h4>Total</h4>
                <div className="delivery-page__order-totals">
                  <div><span>Subtotal:</span><span>R$ {parseFloat(selectedOrder.subtotal).toFixed(2)}</span></div>
                  <div><span>Taxa:</span><span>R$ {parseFloat(selectedOrder.deliveryFee).toFixed(2)}</span></div>
                  {parseFloat((selectedOrder as any).additionalFee || 0) > 0 && (
                    <div><span>Acréscimo:</span><span>R$ {parseFloat((selectedOrder as any).additionalFee).toFixed(2)}</span></div>
                  )}
                  {parseFloat(selectedOrder.discount || 0) > 0 && (
                    <div><span>Desconto:</span><span>-R$ {parseFloat(selectedOrder.discount).toFixed(2)}</span></div>
                  )}
                  <div><strong>Total:</strong><strong>R$ {parseFloat(selectedOrder.total).toFixed(2)}</strong></div>
                </div>
              </div>
            </div>

            <div className="delivery-page__modal-actions">
              <button onClick={() => setIsOrderDetailsOpen(false)} className="delivery-page__btn-cancel">
                Fechar
              </button>
              <button onClick={() => handlePrintOrder(selectedOrder)} className="delivery-page__btn-confirm">
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPage;
