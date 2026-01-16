import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Modal, Loading, Alert } from '@/components/common';
import { Plus, Minus, Trash2, ShoppingCart, DollarSign, UserPlus, Printer } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useCashSessionStore, useCustomersStore } from '@/store';
import { CepSearchInput, CepSearchFieldsDisplay } from '@/components/CepSearchInput';
import { printReceipt, formatCurrency, getPrintStyles } from '@/utils/printer';
import { clearCartDraft, loadCartDraft, saveCartDraft, type CartDraft, type CartDraftItem } from '@/utils/cartDraft';
import type { AddressData } from '@/hooks/useGeolocation';
import './ComandasPage.css';
import '@/styles/assembledModal.css';
import '@/styles/weightModal.css';

interface ComandaItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  observation?: string;
  sizeId?: string;
  flavorsTotal?: number;
  isCancelled?: boolean;
  status: 'PENDING' | 'READY' | 'SERVED';
}

interface Comanda {
  id: string;
  comandaNumber: number;
  tableNumber?: number;
  customerName?: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  items: ComandaItem[];
  subtotal: number;
  discount: number;
  additionalFee?: number;
  total: number;
  openedAt: string;
  closedAt?: string;
}

interface Product {
  id: string;
  name: string;
  code?: string;
  description?: string;
  salePrice: number;
  saleType?: string;
  isActive?: boolean;
  category?: any;
  sizePrices?: any[];
}

const normalizeProduct = (product: any): Product => ({
  id: String(product?.id ?? ''),
  name: product?.name || '',
  code: product?.code || undefined,
  description: product?.description || undefined,
  salePrice: Number(product?.salePrice ?? product?.price ?? 0),
  saleType: product?.saleType || undefined,
  isActive: product?.isActive ?? undefined,
  category: product?.category || undefined,
  sizePrices: product?.sizePrices || undefined,
});

const normalizeProductList = (data: any): Product[] => {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeProduct);
};

const normalizeComandaItem = (item: any): ComandaItem => ({
  id: item?.id || '',
  productId: item?.productId || '',
  productName: item?.productName || '',
  quantity: Number(item?.quantity ?? 0),
  unitPrice: Number(item?.unitPrice ?? 0),
  subtotal: Number(item?.subtotal ?? 0),
  observation: item?.observation || undefined,
  sizeId: item?.sizeId ? String(item.sizeId) : undefined,
  flavorsTotal: item?.flavorsTotal !== undefined && item?.flavorsTotal !== null ? Number(item.flavorsTotal) : undefined,
  isCancelled: Boolean(item?.isCancelled ?? item?.is_cancelled ?? false),
  status: item?.status || 'PENDING',
});

const normalizeComanda = (comanda: any): Comanda => ({
  id: comanda?.id || '',
  comandaNumber: Number(comanda?.comandaNumber ?? 0),
  tableNumber: comanda?.tableNumber ?? undefined,
  customerName: comanda?.customerName || undefined,
  status: (comanda?.status || 'OPEN').toUpperCase() as 'OPEN' | 'CLOSED' | 'CANCELLED',
  items: Array.isArray(comanda?.items)
    ? comanda.items.map(normalizeComandaItem)
    : [],
  subtotal: Number(comanda?.subtotal ?? 0),
  discount: Number(comanda?.discount ?? 0),
  additionalFee: comanda?.additionalFee !== undefined ? Number(comanda?.additionalFee ?? 0) : undefined,
  total: Number(comanda?.total ?? 0),
  openedAt: comanda?.openedAt || '',
  closedAt: comanda?.closedAt || undefined,
});

const normalizeComandaList = (data: any): Comanda[] => {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeComanda);
};

export const ComandasPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSession, loadSession } = useCashSessionStore();
  const { customers, loadCustomers } = useCustomersStore();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCancellingSale, setIsCancellingSale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [isOpenComandaModalOpen, setIsOpenComandaModalOpen] = useState(false);
  // Add item is now inline in the cart header (no modal)

  // Form states
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [observation, setObservation] = useState('');
  const [discount, setDiscount] = useState('0');
  const [additionalFee, setAdditionalFee] = useState('0');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [draftToImport, setDraftToImport] = useState<CartDraft | null>(null);
  const [isImportDraftModalOpen, setIsImportDraftModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [cepAddressData, setCepAddressData] = useState<AddressData | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpf: '',
    birthDate: '',
    gender: '',
    customerType: 'pf',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    referencePoint: '',
    acceptsMarketing: true,
    preferredContactMethod: '',
  });
  
  // Payment states
  const [payments, setPayments] = useState<Array<{method: string; amount: number}>>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  
  // Cupom
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  // Montado
  const [isAssembledModalOpen, setIsAssembledModalOpen] = useState(false);
  const [assembledCategoryId, setAssembledCategoryId] = useState<string>('');
  const [assembledSizeId, setAssembledSizeId] = useState<string>('');
  const [assembledFlavorsTotal, setAssembledFlavorsTotal] = useState<string>('1');
  const [assembledSelectedFlavors, setAssembledSelectedFlavors] = useState<Product[]>([]);
  const [assembledSearchTerm, setAssembledSearchTerm] = useState('');

  // Peso
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [pendingWeightProduct, setPendingWeightProduct] = useState<Product | null>(null);
  const [tempWeight, setTempWeight] = useState('');
  const [isReadingScale, setIsReadingScale] = useState(false);
  const [isAddingInlineItem, setIsAddingInlineItem] = useState(false);

  const toMoneyNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const getProductCategory = (product: Product) => {
    const cat: any = (product as any)?.category;
    return typeof cat === 'object' ? cat : null;
  };

  const assembledSize = useMemo(() => {
    const anyProduct = assembledSelectedFlavors[0];
    const category = anyProduct ? getProductCategory(anyProduct) : null;
    const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
    return sizes.find((s: any) => String(s.id) === String(assembledSizeId)) || null;
  }, [assembledSelectedFlavors, assembledSizeId]);

  const assembledMaxFlavors = assembledSize?.maxFlavors ? Number(assembledSize.maxFlavors) : 1;
  const assembledFlavorsTotalNumber = Math.max(1, Math.min(assembledMaxFlavors, parseInt(assembledFlavorsTotal || '1', 10) || 1));

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
        if (p.isActive === false) return false;
        if (!term) return true;
        return (p.name || '').toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term);
      })
      .slice(0, 30);
  }, [products, assembledCategoryId, assembledSearchTerm]);

  const addAssembledFlavor = (product: Product) => {
    if (assembledSelectedFlavors.length >= assembledFlavorsTotalNumber) return;
    setAssembledSelectedFlavors((prev) => [...prev, product]);
  };

  const removeAssembledFlavor = (index: number) => {
    setAssembledSelectedFlavors((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmAssembledComanda = async () => {
    if (!selectedComanda) return;
    try {
      const sizeId = String(assembledSizeId);
      if (!sizeId) throw new Error('Selecione um tamanho');
      if (!assembledSize) throw new Error('Tamanho inválido');

      const flavorsTotal = assembledFlavorsTotalNumber;
      if (assembledSelectedFlavors.length !== flavorsTotal) {
        throw new Error(`Selecione ${flavorsTotal} sabor(es)`);
      }

      const qty = Math.max(1, Math.floor(parseFloat(quantity) || 1));

      for (const p of assembledSelectedFlavors) {
        await apiClient.post(`/comandas/${selectedComanda.id}/items`, {
          productId: p.id,
          quantity: qty,
          observation: observation || undefined,
          sizeId,
          flavorsTotal,
        });
      }

      await refreshSelectedComanda(selectedComanda.id);
      setSuccess('Item montado adicionado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

      setIsAssembledModalOpen(false);
      setAssembledCategoryId('');
      setAssembledSizeId('');
      setAssembledFlavorsTotal('1');
      setAssembledSelectedFlavors([]);
      setAssembledSearchTerm('');

      setProductSearchTerm('');
      setQuantity('1');
      setObservation('');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao adicionar item montado');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return products;
    const search = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.code?.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search)
    );
  }, [products, productSearchTerm]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];

    const search = customerSearchTerm.toLowerCase();
    return customers
      .filter((c) =>
        c.name?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.cpf?.toLowerCase().includes(search) ||
        c.whatsapp?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search)
      )
      .slice(0, 8);
  }, [customers, customerSearchTerm]);

  // Load data
  useEffect(() => {
    loadData();
    loadSession();
    loadCustomers();
  }, [loadSession, loadCustomers]);

  useEffect(() => {
    const draft = loadCartDraft();
    if (draft?.mode === 'comanda' && draft.items.length > 0) {
      setDraftToImport(draft);
      setDiscount(String(draft.discountValue ?? '0'));
      setAdditionalFee(String(draft.additionalFee ?? '0'));
      setIsImportDraftModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!draftToImport?.selectedCustomerId || customers.length === 0) return;
    const customer = customers.find((c: any) => c.id === draftToImport.selectedCustomerId);
    if (customer?.name) {
      setCustomerName(customer.name);
    }
  }, [draftToImport, customers]);

  const handleSwitchMode = (target: 'pdv' | 'comanda' | 'delivery') => {
    const itemsFromSelectedComanda: CartDraftItem[] =
      selectedComanda?.status === 'OPEN'
        ? (selectedComanda.items || []).map((item) => ({
            id: item.productId,
            productId: item.productId,
            productName: item.productName,
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
            totalPrice: Number(item.subtotal || 0),
          }))
        : [];

    const items: CartDraftItem[] =
      itemsFromSelectedComanda.length > 0 ? itemsFromSelectedComanda : (draftToImport?.items || []);

    if (items.length > 0) {
      saveCartDraft({
        mode: target,
        items,
        selectedCustomerId: selectedCustomerId || draftToImport?.selectedCustomerId,
        discountValue: toMoneyNumber(discount),
        additionalFee: toMoneyNumber(additionalFee),
      });
    }

    if (target === 'delivery') navigate('/delivery');
    else if (target === 'pdv') navigate('/sales');
    else navigate('/comandas');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.querySelector('.comanda-customer-search-group');
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
      const [comandasRes, productsRes] = await Promise.all([
        apiClient.get('/comandas'),
        apiClient.get('/products'),
      ]);

      // Extract data from response: { status: 'success', data: [...] }
      const rawComandas = Array.isArray(comandasRes.data)
        ? comandasRes.data
        : (comandasRes.data?.data || []);
      const rawProducts = Array.isArray(productsRes.data)
        ? productsRes.data
        : (productsRes.data?.data || []);

      setComandas(normalizeComandaList(rawComandas));
      setProducts(normalizeProductList(rawProducts));
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Keep selected comanda in sync across list and detail
  const updateSelectedComandaState = (comandaData: Comanda) => {
    setSelectedComanda(comandaData);
    setComandas((prev) => prev.map((c) => (c.id === comandaData.id ? comandaData : c)));
  };

  const refreshSelectedComanda = async (comandaId: string) => {
    const updatedComanda = await apiClient.get(`/comandas/${comandaId}`);
    const comandaData = normalizeComanda(updatedComanda.data?.data || updatedComanda.data);
    updateSelectedComandaState(comandaData);
    return comandaData;
  };

  const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2)}`;

  useEffect(() => {
    // Reset transient states when switching comandas
    setPayments([]);
    setCurrentPaymentAmount('');
    setPaymentMethod('cash');
    setDiscount(String(selectedComanda?.discount ?? '0'));
    setAdditionalFee(String(selectedComanda?.additionalFee ?? '0'));
    setQuantityInputs({});
    setSelectedCustomerId('');
    setCustomerSearchTerm('');
    setIsCustomerSearchOpen(false);
  }, [selectedComanda?.id]);

  const paymentSummary = useMemo(() => {
    const subtotalValue = selectedComanda?.subtotal || 0;
    const discountValue = selectedComanda?.status === 'OPEN'
      ? parseFloat(discount || '0')
      : selectedComanda?.discount || 0;
    const additionalValue = selectedComanda?.status === 'OPEN'
      ? parseFloat(additionalFee || '0')
      : (selectedComanda?.additionalFee || 0);
    const totalBeforeCoupon = Math.max(0, Number(subtotalValue) + Math.max(0, additionalValue) - Math.max(0, discountValue));
    const totalToPay = selectedComanda?.status === 'CLOSED'
      ? selectedComanda.total
      : Math.max(0, totalBeforeCoupon - couponDiscount);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, totalToPay - totalPaid);
    const change = Math.max(0, totalPaid - totalToPay);

    return {
      subtotalValue,
      discountValue,
      additionalValue: Math.max(0, additionalValue || 0),
      totalToPay,
      totalPaid,
      remaining,
      change,
      isPaid: totalPaid > 0 && remaining === 0,
    };
  }, [selectedComanda, discount, additionalFee, payments, couponDiscount]);

  const openComandaAndMaybeImport = async () => {
    
    // Verifica se existe sessão de caixa aberta
    if (!currentSession?.id) {
      setError('Nenhuma sessão de caixa aberta. Por favor, abra o caixa primeiro.');
      return;
    }

    // Verifica se já existe uma comanda aberta com o mesmo número de mesa
    if (tableNumber) {
      const tableNumberNormalized = tableNumber.trim().toLowerCase();
      const existingComanda = comandas.find(
        (c) => c.status === 'OPEN' && 
        String(c.tableNumber ?? '').trim().toLowerCase() === tableNumberNormalized
      );
      
      if (existingComanda) {
        setError(`Já existe uma comanda aberta para ${tableNumber}. Por favor, feche ou use outra mesa.`);
        return;
      }
    }

    try {
      const response = await apiClient.post('/comandas', {
        cashSessionId: currentSession.id,
        tableNumber: tableNumber || undefined,
        customerName: customerName || undefined,
      });

      const newComanda = normalizeComanda(response.data?.data || response.data || response);

      if (draftToImport && draftToImport.items.length > 0) {
        for (const item of draftToImport.items) {
          await apiClient.post(`/comandas/${newComanda.id}/items`, {
            productId: item.productId,
            quantity: item.quantity,
          });
        }

        const updatedComanda = await apiClient.get(`/comandas/${newComanda.id}`);
        const comandaData = normalizeComanda(updatedComanda.data?.data || updatedComanda.data);
        setComandas([...comandas, comandaData]);
        setSelectedComanda(comandaData);
        clearCartDraft();
        setDraftToImport(null);
        setIsImportDraftModalOpen(false);
      } else {
        setComandas([...comandas, newComanda]);
        setSelectedComanda(newComanda);
      }
      setSuccess('Comanda aberta com sucesso!');
      setIsOpenComandaModalOpen(false);
      setTableNumber('');
      setCustomerName('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao abrir comanda');
    }
  };

  const handleOpenComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    await openComandaAndMaybeImport();
  };

  const handleDiscardDraftImport = () => {
    clearCartDraft();
    setDraftToImport(null);
    setIsImportDraftModalOpen(false);
    setDiscount('0');
    setAdditionalFee('0');
  };

  const handleCancelSale = async () => {
    if (!selectedComanda) {
      // Fallback: at least clear draft/UI if the button is ever shown without a selected comanda
      clearCartDraft();
      setDraftToImport(null);
      setIsImportDraftModalOpen(false);
      setSuccess('Venda cancelada');
      setTimeout(() => setSuccess(null), 2000);
      return;
    }

    const ok = window.confirm(
      `Cancelar a Comanda #${selectedComanda.comandaNumber} e remover todos os itens? Essa ação NÃO pode ser desfeita.`
    );
    if (!ok) return;

    const reason = window.prompt('Informe o motivo do cancelamento:', 'Cancelado pelo usuário');
    if (!reason || reason.trim() === '') {
      setError('É necessário informar um motivo para cancelar a comanda');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsCancellingSale(true);
    try {
      // Remove items explicitly (requested behavior), then cancel the comanda.
      const comandaId = selectedComanda.id;
      const itemsToRemove = Array.isArray(selectedComanda.items) ? selectedComanda.items : [];

      for (const item of itemsToRemove) {
        try {
          await apiClient.delete(`/comandas/${comandaId}/items/${item.id}`, {
            data: { reason: 'Remoção de item durante cancelamento da comanda' },
          });
        } catch {
          // Best-effort deletion; continue.
        }
      }

      await apiClient.post(`/comandas/${comandaId}/cancel`, { reason: reason.trim() });

      setComandas((prev) => prev.filter((c) => c.id !== comandaId));
      setSelectedComanda(null);

      setPayments([]);
      setPaymentMethod('cash');
      setCurrentPaymentAmount('');
      setQuantityInputs({});

      setDiscount('0');
      setAdditionalFee('0');
      setSelectedCustomerId('');
      setCustomerName('');
      setTableNumber('');
      setCustomerSearchTerm('');
      setIsCustomerSearchOpen(false);

      clearCartDraft();
      setDraftToImport(null);
      setIsImportDraftModalOpen(false);

      setSuccess('Comanda cancelada e itens removidos com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cancelar comanda');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsCancellingSale(false);
    }
  };

  const addProductFromSearchClick = async (product: Product) => {
    if (!selectedComanda) {
      setError('Selecione uma comanda');
      setTimeout(() => setError(null), 2500);
      return;
    }
    if (isAddingInlineItem) return;

    const category = getProductCategory(product);
    const isAssembled = category?.categoryType === 'assembled';
    if (isAssembled) {
      const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
      if (sizes.length === 0) {
        setError('Categoria Montado sem tamanhos cadastrados');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Fecha a lista de resultados, mas mantém qty/obs para usar na confirmação do montado
      setProductSearchTerm('');
      setAssembledCategoryId(String(category.id));
      setAssembledSizeId(String(sizes[0].id));
      setAssembledFlavorsTotal('1');
      setAssembledSelectedFlavors([product]);
      setAssembledSearchTerm('');
      setIsAssembledModalOpen(true);
      return;
    }

    const isWeight = String((product as any)?.saleType || '').toLowerCase() === 'weight';
    if (isWeight) {
      // Fecha a lista de resultados, peso será informado/lido no modal
      setProductSearchTerm('');
      setPendingWeightProduct(product);
      setTempWeight('');
      setIsWeightModalOpen(true);
      return;
    }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Quantidade deve ser maior que zero');
      setTimeout(() => setError(null), 2500);
      return;
    }

    setIsAddingInlineItem(true);
    try {
      await apiClient.post(`/comandas/${selectedComanda.id}/items`, {
        productId: product.id,
        quantity: qty,
        observation: observation || undefined,
      });

      await refreshSelectedComanda(selectedComanda.id);
      setSuccess('Item adicionado com sucesso!');
      setTimeout(() => setSuccess(null), 2000);

      setProductSearchTerm('');
      setQuantity('1');
      setObservation('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao adicionar item');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsAddingInlineItem(false);
    }
  };

  const parseWeightInput = (value: string): number => {
    const cleaned = value
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^\d.,]/g, '');

    if (!cleaned) return NaN;

    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;

    if (lastComma > -1 && lastDot > -1) {
      if (lastComma > lastDot) {
        normalized = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = cleaned.replace(/,/g, '');
      }
    } else if (lastComma > -1) {
      normalized = cleaned.replace(',', '.');
    }

    return parseFloat(normalized);
  };

  const handleConfirmWeightComanda = async () => {
    if (!selectedComanda || !pendingWeightProduct) return;

    const productId = String((pendingWeightProduct as any)?.id ?? '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId);
    if (!isUuid) {
      setError('Produto inválido para item por peso');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const weight = parseWeightInput(tempWeight);
    if (isNaN(weight) || weight <= 0) {
      setError('Informe um peso válido (kg)');
      setTimeout(() => setError(null), 2500);
      return;
    }

    const weightRounded = Number(weight.toFixed(3));
    if (!Number.isFinite(weightRounded) || weightRounded <= 0) {
      setError('Informe um peso válido (kg)');
      setTimeout(() => setError(null), 2500);
      return;
    }

    try {
      await apiClient.post(`/comandas/${selectedComanda.id}/items`, {
        productId,
        quantity: weightRounded,
        observation: observation || undefined,
      });

      await refreshSelectedComanda(selectedComanda.id);

      setSuccess('Item por peso adicionado com sucesso!');
      setTimeout(() => setSuccess(null), 2500);

      setIsWeightModalOpen(false);
      setPendingWeightProduct(null);
      setTempWeight('');

      // Clear inline add UI
      setProductSearchTerm('');
      setQuantity('1');
      setObservation('');
    } catch (err: any) {
      const status = err?.response?.status;
      const respData = err?.response?.data;
      const backendMessage = respData?.message;
      const fallback = err?.message || 'Erro ao adicionar item por peso';

      // Helpful diagnostics for 422s
      // eslint-disable-next-line no-console
      console.error('Comandas weight add failed', {
        status,
        respData,
        payload: {
          productId,
          quantity: weightRounded,
          observation: observation || undefined,
        },
      });

      const details = respData && !backendMessage ? JSON.stringify(respData) : '';
      setError(backendMessage || (details ? `${fallback}: ${details}` : fallback));
      setTimeout(() => setError(null), 3000);
    }
  };

  const normalizeScaleWeight = (value: number) => {
    if (!Number.isFinite(value)) return value;
    // Some protocols send grams without decimal point (e.g., 500 -> 0.500 kg)
    if (value > 100 && value < 100000) return value / 1000;
    return value;
  };

  const readWeightFromScale = async () => {
    if (isReadingScale) return;
    setIsReadingScale(true);
    try {
      const data = await apiClient.get('/scale/weight');
      const weightRaw = Number((data as any)?.weightKg);
      const weightKg = normalizeScaleWeight(weightRaw);
      if (!Number.isFinite(weightKg) || weightKg <= 0) {
        throw new Error('Peso inválido retornado pela balança');
      }
      setTempWeight(weightKg.toFixed(3));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao ler peso da balança');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsReadingScale(false);
    }
  };

  const clearInlineAdd = () => {
    setProductSearchTerm('');
    setQuantity('1');
    setObservation('');
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedComanda) return;

    try {
      await apiClient.delete(`/comandas/${selectedComanda.id}/items/${itemId}`, {
        data: { reason: 'Removido pelo usuário' },
      });
      await refreshSelectedComanda(selectedComanda.id);

      setSuccess('Item removido com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao remover item');
    }
  };

  const handleUpdateItemQuantity = async (item: ComandaItem, newQuantity: number) => {
    if (!selectedComanda || selectedComanda.status !== 'OPEN') return;

    const safeQuantity = Math.max(1, Number.isFinite(newQuantity) ? newQuantity : item.quantity);

    try {
      await apiClient.put(`/comandas/${selectedComanda.id}/items/${item.id}`, {
        quantity: safeQuantity,
      });

      await refreshSelectedComanda(selectedComanda.id);
      setQuantityInputs((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setSuccess('Quantidade atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar quantidade');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getComandaItemSizeLabel = (item: ComandaItem): string => {
    const sizeId = item?.sizeId ? String(item.sizeId) : '';
    if (!sizeId) return '';

    const product = products.find((p: any) => String(p?.id) === String(item.productId));
    const category = product ? getProductCategory(product as any) : null;
    const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
    const found = sizes.find((s: any) => String(s.id) === sizeId);
    return found?.name ? String(found.name) : '';
  };

  const groupedComandaItems = useMemo(() => {
    type GroupEntry = {
      kind: 'group';
      groupKey: string;
      sizeLabel: string;
      flavorsTotal: number;
      items: ComandaItem[];
      total: number;
      quantity: number;
      observation?: string;
    };
    type ItemEntry = { kind: 'item'; item: ComandaItem };

    const parseAssembledMeta = (name: string) => {
      // Backend montado naming: "Sabor (Tamanho 1/N)".
      // Example: "Chocolate (P 1/2)"
      const m = String(name || '').match(/\((.+)\s+1\/(\d+)\)\s*$/);
      if (!m) return null;
      const sizeLabel = String(m[1] || '').trim();
      const flavorsTotal = Number(m[2]);
      if (!sizeLabel || !Number.isFinite(flavorsTotal) || flavorsTotal < 1) return null;
      const suffix = ` (${sizeLabel} 1/${flavorsTotal})`;
      const flavorName = String(name || '').endsWith(suffix)
        ? String(name || '').slice(0, -suffix.length).trim()
        : String(name || '').trim();
      return { sizeLabel, flavorsTotal, flavorName };
    };

    const items = (selectedComanda?.items || []).filter((it) => !it?.isCancelled);
    const result: Array<GroupEntry | ItemEntry> = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const meta = parseAssembledMeta(it?.productName || '');
      const sizeLabel = meta?.sizeLabel || '';
      const flavorsTotal = Number(meta?.flavorsTotal ?? 0);
      const shouldGroup = Boolean(sizeLabel) && flavorsTotal > 1;

      if (!shouldGroup) {
        result.push({ kind: 'item', item: it });
        continue;
      }

      const take = items.slice(i, i + flavorsTotal);
      const sameGroup =
        take.length === flavorsTotal &&
        take.every((x) => {
          const xm = parseAssembledMeta(x?.productName || '');
          const xSizeLabel = xm?.sizeLabel || '';
          const xFlavors = Number(xm?.flavorsTotal ?? 0);
          return (
            xSizeLabel === sizeLabel &&
            xFlavors === flavorsTotal &&
            Number(x.quantity) === Number(it.quantity) &&
            String(x.observation || '') === String(it.observation || '')
          );
        });

      if (!sameGroup) {
        result.push({ kind: 'item', item: it });
        continue;
      }

      const total = take.reduce((sum, x) => {
        const lineTotal = Number.isFinite(x.subtotal) ? x.subtotal : Number(x.unitPrice || 0) * Number(x.quantity || 0);
        return sum + (Number.isFinite(lineTotal) ? lineTotal : 0);
      }, 0);

      result.push({
        kind: 'group',
        groupKey: `grp_${it.id}`,
        sizeLabel,
        flavorsTotal,
        items: take,
        total,
        quantity: it.quantity,
        observation: it.observation,
      });

      i += flavorsTotal - 1;
    }

    return result;
  }, [selectedComanda?.items]);

  const handleRemoveGroupItems = async (items: ComandaItem[]) => {
    if (!selectedComanda) return;
    try {
      await Promise.all(
        items.map((it) =>
          apiClient.delete(`/comandas/${selectedComanda.id}/items/${it.id}`, {
            data: { reason: 'Removido pelo usuário (montado)' },
          })
        )
      );
      await refreshSelectedComanda(selectedComanda.id);
      setSuccess('Item montado removido com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao remover item montado');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateGroupQuantity = async (items: ComandaItem[], newQuantity: number, groupKey?: string) => {
    if (!selectedComanda || selectedComanda.status !== 'OPEN') return;
    const safeQuantity = Math.max(1, Number.isFinite(newQuantity) ? newQuantity : 1);

    try {
      await Promise.all(
        items.map((it) =>
          apiClient.put(`/comandas/${selectedComanda.id}/items/${it.id}`, {
            quantity: safeQuantity,
          })
        )
      );

      await refreshSelectedComanda(selectedComanda.id);
      setQuantityInputs((prev) => {
        const next = { ...prev };
        for (const it of items) delete next[it.id];
        if (groupKey) delete next[groupKey];
        return next;
      });
      setSuccess('Quantidade atualizada com sucesso!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar quantidade');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/customers', customerForm);
      const newCustomer = response.data?.data || response.data;
      
      // Recarrega lista de clientes
      await loadCustomers();
      
      // Seleciona automaticamente o novo cliente
      setSelectedCustomerId(newCustomer.id);
      
      // Limpa o formulário
      setCustomerForm({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        cpf: '',
        birthDate: '',
        gender: '',
        customerType: 'pf',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        referencePoint: '',
        acceptsMarketing: true,
        preferredContactMethod: '',
      });
      
      setIsNewCustomerModalOpen(false);
      setSuccess('Cliente cadastrado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao cadastrar cliente');
      setTimeout(() => setError(null), 3000);
    }
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Digite um código de cupom');
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (!selectedComanda) {
      setError('Selecione uma comanda para aplicar o cupom');
      setTimeout(() => setError(null), 2000);
      return;
    }

    if (!selectedCustomerId) {
      setError('Selecione um cliente para aplicar o cupom');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setIsCouponLoading(true);
    try {
      const currentSubtotal = selectedComanda.items
        .filter(item => !item.isCancelled)
        .reduce((sum, item) => sum + item.subtotal, 0);
      
      const response = await apiClient.validateCoupon(
        couponCode.trim(), 
        currentSubtotal, 
        selectedCustomerId
      );
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

  const handleAddPayment = () => {
    const parsed = parseFloat((currentPaymentAmount || '').replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setError('Digite um valor válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPayments([...payments, { method: paymentMethod, amount: parseFloat(parsed.toFixed(2)) }]);
    setCurrentPaymentAmount('');
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'credit_card': return 'Cartão Crédito';
      case 'debit_card': return 'Cartão Débito';
      case 'pix': return 'PIX';
      default: return method;
    }
  };

  const handlePrintPreBill = () => {
    if (!selectedComanda) return;

    const subtotalValue = Number(selectedComanda.subtotal || 0);
    const discountValue =
      selectedComanda.status === 'OPEN' ? paymentSummary.discountValue : Number(selectedComanda.discount || 0);
    const additionalValue =
      selectedComanda.status === 'OPEN'
        ? paymentSummary.additionalValue
        : Number(selectedComanda.additionalFee || 0);
    const totalValue =
      selectedComanda.status === 'OPEN' ? paymentSummary.totalToPay : Number(selectedComanda.total || 0);

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const customerInfo = selectedCustomerId ? 
      customers.find(c => c.id === selectedCustomerId)?.name || 'Consumidor Final' : 
      selectedComanda.customerName || 'Consumidor Final';

    const itemsHTML = selectedComanda.items.map((item) => `
      <tr>
        <td class="print-table-item-name">${item.productName}</td>
        <td class="print-table-col-qty">${item.quantity.toFixed(3)}</td>
        <td class="print-table-col-price">R$ ${item.unitPrice.toFixed(2)}</td>
        <td class="print-table-col-total">R$ ${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const content = `
      <div class="print-section">
        <div class="print-row">
          <span class="print-row-label"><strong>Comanda:</strong></span>
          <span class="print-row-value">#${selectedComanda.comandaNumber}</span>
        </div>
        ${selectedComanda.tableNumber ? `
          <div class="print-row">
            <span class="print-row-label">Mesa:</span>
            <span class="print-row-value">${selectedComanda.tableNumber}</span>
          </div>
        ` : ''}
        <div class="print-row">
          <span class="print-row-label">Cliente:</span>
          <span class="print-row-value">${customerInfo}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Data/Hora:</span>
          <span class="print-row-value">${dateStr} ${timeStr}</span>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="print-table-col-qty">Qtd</th>
            <th class="print-table-col-price">Valor</th>
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
          <span class="print-row-value">${formatCurrency(subtotalValue)}</span>
        </div>
        ${discountValue > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(discountValue)}</span>
          </div>
        ` : ''}
        ${additionalValue > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Acréscimo:</span>
            <span class="print-row-value">${formatCurrency(additionalValue)}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div class="print-footer">
        <div class="print-footer-text">*** PRÉ-CONTA ***</div>
        <div class="print-footer-text">{{FOOTER_TEXT}}</div>
        <div class="print-footer-text">Conferência do cliente</div>
        <div class="print-footer-line">{{FOOTER_SECONDARY}}</div>
      </div>
    `;

    printReceipt({
      title: 'Pré-Conta',
      subtitle: `Comanda #${selectedComanda.comandaNumber}`,
      content
    });
  };

  const handlePrintFinalComanda = (params: {
    comanda: any;
    payments: typeof payments;
    customerInfo: string;
  }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const items = params.comanda?.items || [];

    const itemsHTML = items.map((item: any) => `
      <tr>
        <td class="print-table-item-name">${item.productName}</td>
        <td class="print-table-col-qty">${Number(item.quantity).toFixed(3)}</td>
        <td class="print-table-col-price">R$ ${Number(item.unitPrice || 0).toFixed(2)}</td>
        <td class="print-table-col-total">R$ ${Number(item.subtotal || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const paymentsHTML = params.payments.length > 0 ? `
      <div class="print-section">
        <div class="print-section-title">Formas de Pagamento</div>
        ${params.payments.map((p) => `
          <div class="print-row">
            <span class="print-row-label">${getPaymentMethodLabel(p.method)}</span>
            <span class="print-row-value">${formatCurrency(p.amount)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const subtotalValue = Number(params.comanda?.subtotal || 0);
    const discountValue = Number(params.comanda?.discount || 0);
    const additionalValue = Number(params.comanda?.additionalFee || 0);
    const totalValue = Number(params.comanda?.total || 0);

    const content = `
      <div class="print-section">
        <div class="print-row">
          <span class="print-row-label"><strong>Comanda:</strong></span>
          <span class="print-row-value">#${params.comanda?.comandaNumber || ''}</span>
        </div>
        ${params.comanda?.tableNumber ? `
          <div class="print-row">
            <span class="print-row-label">Mesa:</span>
            <span class="print-row-value">${params.comanda.tableNumber}</span>
          </div>
        ` : ''}
        <div class="print-row">
          <span class="print-row-label">Cliente:</span>
          <span class="print-row-value">${params.customerInfo}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Data/Hora:</span>
          <span class="print-row-value">${dateStr} ${timeStr}</span>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="print-table-col-qty">Qtd</th>
            <th class="print-table-col-price">Valor</th>
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
          <span class="print-row-value">${formatCurrency(subtotalValue)}</span>
        </div>
        ${discountValue > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(discountValue)}</span>
          </div>
        ` : ''}
        ${additionalValue > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Acréscimo:</span>
            <span class="print-row-value">${formatCurrency(additionalValue)}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(totalValue)}</span>
        </div>
      </div>

      ${paymentsHTML}

      <div class="print-footer">
        <div class="print-footer-text">Conta Final</div>
        <div class="print-footer-line">{{FOOTER_TEXT}}</div>
        <div class="print-footer-line">{{FOOTER_SECONDARY}}</div>
      </div>
    `;

    printReceipt({
      title: 'Conta Final',
      subtitle: `Comanda #${params.comanda?.comandaNumber || ''}`,
      content,
    });
  };

  const handleCloseComanda = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (!selectedComanda) return;

    if (payments.length === 0) {
      setError('Adicione pelo menos uma forma de pagamento');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (paymentSummary.remaining > 0) {
      setError(`Faltam R$ ${paymentSummary.remaining.toFixed(2)} para pagar`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Incluir desconto do cupom + desconto manual no desconto total
      const totalDiscount = paymentSummary.discountValue + couponDiscount;
      
      const closePayload: any = {
        discount: totalDiscount,
        additionalFee: paymentSummary.additionalValue,
        payments: payments.map(p => ({
          paymentMethod: p.method,
          amount: p.amount
        }))
      };
      
      const response = await apiClient.post(`/comandas/${selectedComanda.id}/close`, closePayload);

      const comandaData = normalizeComanda(response.data?.data || response.data);
      const customerInfo = selectedComanda.customerName || 'Cliente não informado';

      handlePrintFinalComanda({
        comanda: comandaData,
        payments,
        customerInfo,
      });
      updateSelectedComandaState(comandaData);
      setSuccess('Comanda fechada com sucesso!');
      setDiscount('0');
      setAdditionalFee('0');
      setPayments([]);
      setCurrentPaymentAmount('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fechar comanda');
    }
  };

  const handleReopenComanda = async (comandaId?: string) => {
    const comandaToReopen = comandaId 
      ? comandas.find(c => c.id === comandaId) 
      : selectedComanda;
    
    if (!comandaToReopen) return;

    const reason = window.prompt('Por favor, informe o motivo da reabertura da comanda:');
    if (!reason || reason.trim() === '') {
      setError('É necessário informar um motivo para reabrir a comanda');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const response = await apiClient.post(`/comandas/${comandaToReopen.id}/reopen`, {
        reason: reason.trim()
      });
      const comandaData = normalizeComanda(response.data?.data || response.data);
      setComandas(comandas.map((c) => (c.id === comandaToReopen.id ? comandaData : c)));
      
      // Se é a comanda selecionada, atualiza também
      if (selectedComanda?.id === comandaToReopen.id) {
        setSelectedComanda(comandaData);
      }
      
      setSuccess('Comanda reaberta com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao reabrir comanda');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) return <Loading message="Carregando comandas..." />;

  return (
    <div className="comandas-page">
      <div className="page-header">
        <ShoppingCart size={32} />
        <h1>Gerenciar Comandas</h1>
      </div>

      {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <div className="comandas-container">
        {/* Comandas List */}
        <div className="comandas-list-section">
          <div className="comandas-list-header">
            <h2>Comandas Ativas</h2>
            <Button variant="primary" onClick={() => setIsOpenComandaModalOpen(true)}>
              <Plus size={18} />
              Nova Comanda
            </Button>
          </div>

          <div className="comandas-grid">
            {comandas
              .filter((c) => c.status === 'OPEN')
              .map((comanda) => (
                <div
                  key={comanda.id}
                  className={`comanda-card ${
                    selectedComanda?.id === comanda.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedComanda(comanda)}
                >
                  <div className="comanda-card-header">
                    <div>
                      <h3 className="comanda-number">
                        #{comanda.comandaNumber}
                        {comanda.tableNumber && ` - Mesa ${comanda.tableNumber}`}
                      </h3>
                      {comanda.customerName && (
                        <p className="comanda-customer">{comanda.customerName}</p>
                      )}
                    </div>
                    <div className="comanda-status open">ABERTA</div>
                  </div>

                  <div className="comanda-card-items">
                    <p className="comanda-item-count">{comanda.items.length} itens</p>
                  </div>

                  <div className="comanda-card-footer">
                    <p className="comanda-total">
                      <strong>R$ {comanda.total.toFixed(2)}</strong>
                    </p>
                  </div>
                </div>
              ))}

            {comandas.filter((c) => c.status === 'OPEN').length === 0 && (
              <div className="comandas-empty">
                <p>Nenhuma comanda aberta</p>
              </div>
            )}
          </div>

          {comandas.some((c) => c.status === 'CLOSED') && (
            <>
              <h2 className="comandas-closed-title">Comandas Fechadas</h2>
              <div className="comandas-table-wrapper">
                <table className="comandas-table">
                  <thead>
                    <tr>
                      <th>Comanda</th>
                      <th>Mesa</th>
                      <th>Itens</th>
                      <th>Total</th>
                      <th>Fechado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas
                      .filter((c) => c.status === 'CLOSED')
                      .map((comanda) => (
                        <tr key={comanda.id}>
                          <td>#{comanda.comandaNumber}</td>
                          <td>{comanda.tableNumber || '-'}</td>
                          <td>{comanda.items.length}</td>
                          <td>R$ {comanda.total.toFixed(2)}</td>
                          <td>{new Date(comanda.closedAt || '').toLocaleString()}</td>
                          <td>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReopenComanda(comanda.id);
                              }}
                              className="comanda-reopen-btn"
                              title="Reabrir comanda para correções"
                            >
                              🔓 Reabrir
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Comanda Details */}
        {selectedComanda && (
          <div className="comanda-details-section">
            <Card>
              <div className="comanda-details-header">
                <div>
                  <h2>Comanda #{selectedComanda.comandaNumber}</h2>
                  {selectedComanda.tableNumber && (
                    <p className="comanda-details-subtitle">Mesa {selectedComanda.tableNumber}</p>
                  )}
                  {selectedComanda.customerName && (
                    <p className="comanda-details-subtitle">{selectedComanda.customerName}</p>
                  )}
                </div>

                <div className="comanda-details-status">
                  <div className={`status-badge ${selectedComanda.status.toLowerCase()}`}>
                    {selectedComanda.status === 'OPEN' ? 'ABERTA' : 'FECHADA'}
                  </div>
                </div>
              </div>

              <div className="comanda-cart">
                <div className="comanda-cart-header">
                  <div className="comanda-cart-title-row">
                    <h3>Itens da Comanda</h3>
                    <div className="comanda-cart-title-actions">
                      <select
                        className="comanda-cart-mode-select"
                        value="comanda"
                        onChange={(e) => handleSwitchMode(e.target.value as any)}
                        title="Trocar módulo"
                      >
                        <option value="pdv">PDV</option>
                        <option value="comanda">Comanda</option>
                        <option value="delivery">Delivery</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleCancelSale}
                        className="comanda-cart-cancel-sale-btn"
                        title="Cancelar a comanda e remover todos os itens"
                        disabled={isCancellingSale || selectedComanda.status === 'CANCELLED'}
                      >
                        {isCancellingSale ? 'Cancelando...' : 'Cancelar venda'}
                      </button>
                    </div>
                  </div>
                  {selectedComanda.status === 'OPEN' && (
                    <div className="comanda-inline-add" aria-label="Adicionar item na comanda">
                      <div className="comanda-inline-add__row">
                        <input
                          type="text"
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const first = filteredProducts?.[0];
                            if (first) addProductFromSearchClick(first);
                          }}
                          placeholder="Buscar produto (nome/código/descrição)"
                          className="comanda-inline-add__search"
                          title="Buscar produto"
                        />
                        <button
                          type="button"
                          onClick={clearInlineAdd}
                          className="comanda-inline-add__clear"
                          title="Limpar busca"
                          disabled={!productSearchTerm && quantity === '1' && !observation}
                        >
                          Limpar
                        </button>
                      </div>

                      {productSearchTerm && (
                        <div className="comanda-inline-add__results">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.slice(0, 15).map((p) => (
                              <button
                                type="button"
                                key={p.id}
                                className="comanda-inline-add__result"
                                onClick={() => addProductFromSearchClick(p)}
                                title="Selecionar produto"
                                disabled={isAddingInlineItem}
                              >
                                <span className="comanda-inline-add__result-name">
                                  {p.code ? `[${p.code}] ` : ''}{p.name}
                                </span>
                                <span className="comanda-inline-add__result-price">
                                  R$ {Number(p.salePrice || 0).toFixed(2)}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="comanda-inline-add__empty">Nenhum produto encontrado</div>
                          )}
                        </div>
                      )}

                      <div className="comanda-inline-add__row comanda-inline-add__row--details">
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          min={1}
                          className="comanda-inline-add__qty"
                          title="Quantidade"
                        />
                        <input
                          type="text"
                          value={observation}
                          onChange={(e) => setObservation(e.target.value)}
                          className="comanda-inline-add__obs"
                          placeholder="Observação (opcional)"
                          title="Observação"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="comanda-cart-items">
                  {groupedComandaItems.length === 0 ? (
                    <p className="comanda-cart-empty">Nenhum item selecionado</p>
                  ) : (
                    groupedComandaItems.map((entry) => {
                      if (entry.kind === 'group') {
                        const title = `Montado${entry.sizeLabel ? ` - ${entry.sizeLabel}` : ''} (${entry.flavorsTotal} sabor(es))`;
                        const stripSuffix = (name: string) => {
                          const suffix = ` (${entry.sizeLabel} 1/${entry.flavorsTotal})`;
                          return String(name || '').endsWith(suffix)
                            ? String(name || '').slice(0, -suffix.length).trim()
                            : String(name || '').trim();
                        };
                        return (
                          <div key={entry.groupKey} className="comanda-cart-item">
                            <div className="comanda-cart-item-info">
                              <p className="comanda-cart-item-name">{title}</p>
                              {entry.observation && (
                                <p className="comanda-cart-item-observation">{entry.observation}</p>
                              )}

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                                {entry.items.map((it) => (
                                  <div
                                    key={it.id}
                                    style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}
                                  >
                                    <span>
                                      {stripSuffix(it.productName)}
                                      {it.quantity > 1 ? ` x${it.quantity}` : ''}
                                    </span>
                                    <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                                      {formatCurrency(it.unitPrice * it.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {selectedComanda.status === 'OPEN' ? (
                                <div className="comanda-cart-item-controls" style={{ marginTop: 10 }}>
                                  <button
                                    onClick={() => handleUpdateGroupQuantity(entry.items, entry.quantity - 1, entry.groupKey)}
                                    className="comanda-cart-item-btn"
                                    title="Diminuir quantidade"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <input
                                    type="text"
                                    className="comanda-cart-item-quantity"
                                    value={
                                      quantityInputs[entry.groupKey] !== undefined
                                        ? quantityInputs[entry.groupKey]
                                        : entry.quantity.toString()
                                    }
                                    onChange={(e) => setQuantityInputs({ ...quantityInputs, [entry.groupKey]: e.target.value })}
                                    onBlur={(e) => {
                                      const raw = e.target.value.replace(',', '.');
                                      const parsed = parseFloat(raw);
                                      if (!isNaN(parsed) && parsed > 0) {
                                        handleUpdateGroupQuantity(entry.items, parsed, entry.groupKey);
                                      } else {
                                        setQuantityInputs((prev) => {
                                          const next = { ...prev };
                                          delete next[entry.groupKey];
                                          return next;
                                        });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    title="Quantidade do item montado"
                                  />
                                  <button
                                    onClick={() => handleUpdateGroupQuantity(entry.items, entry.quantity + 1, entry.groupKey)}
                                    className="comanda-cart-item-btn"
                                    title="Aumentar quantidade"
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <span className="comanda-cart-item-total">{formatCurrency(entry.total)}</span>
                                </div>
                              ) : (
                                <p className="comanda-cart-item-qty-readonly">Total — {formatCurrency(entry.total)}</p>
                              )}
                            </div>

                            {selectedComanda.status === 'OPEN' && (
                              <button
                                onClick={() => handleRemoveGroupItems(entry.items)}
                                className="comanda-cart-item-remove"
                                title="Remover item montado"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      }

                      const item = entry.item;
                      return (
                        <div key={item.id} className="comanda-cart-item">
                          <div className="comanda-cart-item-info">
                            <p className="comanda-cart-item-name">{item.productName}</p>
                            {item.observation && (
                              <p className="comanda-cart-item-observation">{item.observation}</p>
                            )}

                            {selectedComanda.status === 'OPEN' ? (
                              <div className="comanda-cart-item-controls">
                                <button
                                  onClick={() => handleUpdateItemQuantity(item, item.quantity - 1)}
                                  className="comanda-cart-item-btn"
                                  title="Diminuir quantidade"
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="text"
                                  className="comanda-cart-item-quantity"
                                  value={quantityInputs[item.id] !== undefined ? quantityInputs[item.id] : item.quantity.toString()}
                                  onChange={(e) => setQuantityInputs({ ...quantityInputs, [item.id]: e.target.value })}
                                  onBlur={(e) => {
                                    const raw = e.target.value.replace(',', '.');
                                    const parsed = parseFloat(raw);
                                    if (!isNaN(parsed) && parsed > 0) {
                                      handleUpdateItemQuantity(item, parsed);
                                    } else {
                                      setQuantityInputs((prev) => {
                                        const next = { ...prev };
                                        delete next[item.id];
                                        return next;
                                      });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  title="Quantidade do item"
                                />
                                <button
                                  onClick={() => handleUpdateItemQuantity(item, item.quantity + 1)}
                                  className="comanda-cart-item-btn"
                                  title="Aumentar quantidade"
                                >
                                  <Plus size={14} />
                                </button>
                                <span className="comanda-cart-item-total">{formatCurrency(item.unitPrice * item.quantity)}</span>
                              </div>
                            ) : (
                              <p className="comanda-cart-item-qty-readonly">
                                {item.quantity}x {formatCurrency(item.unitPrice)} — {formatCurrency(item.subtotal)}
                              </p>
                            )}
                          </div>

                          {selectedComanda.status === 'OPEN' && (
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="comanda-cart-item-remove"
                              title="Remover item"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="comanda-cart-section">
                  <label className="comanda-cart-section-label">Cliente (Opcional)</label>

                  <div className="comanda-customer-search-group">
                    {selectedCustomerId && (
                      <div className="comanda-customer-selected">
                        <div className="comanda-customer-selected-name">
                          {customers.find((c) => c.id === selectedCustomerId)?.name || 'Consumidor Final'}
                        </div>
                        <div className="comanda-customer-selected-info">
                          {customers.find((c) => c.id === selectedCustomerId)?.cpf || customers.find((c) => c.id === selectedCustomerId)?.phone || 'Dados não informados'}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCustomerId('');
                            setCustomerSearchTerm('');
                          }}
                          className="comanda-customer-remove"
                          title="Remover cliente"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="comanda-customer-search-input-wrapper">
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          setCustomerSearchTerm(e.target.value);
                          setIsCustomerSearchOpen(true);
                        }}
                        onFocus={() => setIsCustomerSearchOpen(true)}
                        placeholder="Buscar cliente por nome, CPF ou telefone..."
                        className="comanda-customer-search-input"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="comanda-new-customer-btn"
                        title="Cadastrar novo cliente"
                      >
                        <UserPlus size={18} />
                      </button>

                      {isCustomerSearchOpen && (
                        <div className="comanda-customer-search-results">
                          {filteredCustomers.length > 0 ? (
                            <>
                              {filteredCustomers.map((customer) => (
                                <button
                                  key={customer.id}
                                  onClick={() => {
                                    setSelectedCustomerId(customer.id);
                                    setCustomerSearchTerm('');
                                    setIsCustomerSearchOpen(false);
                                  }}
                                  className="comanda-customer-search-item"
                                >
                                  <span className="comanda-customer-search-item-name">{customer.name}</span>
                                  <span className="comanda-customer-search-item-info">{customer.cpf || customer.phone || customer.whatsapp || customer.email}</span>
                                </button>
                              ))}
                              <button
                                onClick={() => {
                                  setSelectedCustomerId('');
                                  setCustomerSearchTerm('');
                                  setIsCustomerSearchOpen(false);
                                }}
                                className="comanda-customer-search-item comanda-customer-search-item--final"
                              >
                                Consumidor Final
                              </button>
                            </>
                          ) : customerSearchTerm ? (
                            <div className="comanda-customer-search-empty">Nenhum cliente encontrado</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedComanda.status === 'OPEN' && (
                  <div className="comanda-cart-section comanda-cart-discount">
                    <label className="comanda-cart-section-label">Acréscimo</label>
                    <input
                      type="text"
                      value={additionalFee}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setAdditionalFee(value);
                        }
                      }}
                      placeholder="0,00"
                      className="comanda-cart-discount-input"
                    />
                  </div>
                )}

                {selectedComanda.status === 'OPEN' && (
                  <div className="comanda-cart-section comanda-cart-discount">
                    <label className="comanda-cart-section-label">Desconto</label>
                    <input
                      type="text"
                      value={discount}
                      onChange={(e) => {
                        const value = e.target.value.replace(',', '.');
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setDiscount(value);
                        }
                      }}
                      placeholder="0,00"
                      className="comanda-cart-discount-input"
                    />
                  </div>
                )}

                {selectedComanda.status === 'OPEN' && (
                  <div className="comanda-cart-section comanda-cart-discount">
                    <label className="comanda-cart-section-label">Cupom de Desconto</label>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Digite o código"
                        disabled={!!appliedCoupon || isCouponLoading}
                        className="comanda-cart-discount-input"
                        style={{flex: 1}}
                      />
                      {appliedCoupon ? (
                        <button
                          onClick={handleRemoveCoupon}
                          className="comanda-cart-coupon-btn comanda-cart-coupon-btn--remove"
                          title="Remover cupom"
                        >
                          ✕
                        </button>
                      ) : (
                        <button
                          onClick={handleApplyCoupon}
                          className="comanda-cart-coupon-btn"
                          disabled={!couponCode.trim() || isCouponLoading}
                          title="Aplicar cupom"
                        >
                          {isCouponLoading ? '...' : 'Aplicar'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="comanda-cart-totals">
                  <div className="comanda-cart-totals-row">
                    <span>Subtotal</span>
                    <span className="comanda-cart-totals-value">{formatCurrency(paymentSummary.subtotalValue)}</span>
                  </div>
                  {paymentSummary.additionalValue > 0 && (
                    <div className="comanda-cart-totals-row">
                      <span>Acréscimo</span>
                      <span className="comanda-cart-totals-value">{formatCurrency(paymentSummary.additionalValue)}</span>
                    </div>
                  )}
                  {paymentSummary.discountValue > 0 && (
                    <div className="comanda-cart-totals-row comanda-cart-totals-row--discount">
                      <span>Desconto</span>
                      <span className="comanda-cart-totals-value">- {formatCurrency(paymentSummary.discountValue)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="comanda-cart-totals-row comanda-cart-totals-row--discount">
                      <span>Desconto Cupom ({appliedCoupon?.code})</span>
                      <span className="comanda-cart-totals-value">- {formatCurrency(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="comanda-cart-totals-row comanda-cart-totals-row--final">
                    <span>Total</span>
                    <span className="comanda-cart-totals-value">{formatCurrency(paymentSummary.totalToPay)}</span>
                  </div>
                </div>

                {selectedComanda.status === 'OPEN' && selectedComanda.items.length > 0 && (
                  <div className="comanda-payment-inline">
                    <div className="comanda-payment-inline-header">
                      <h3>Pagamentos</h3>
                      <span className="comanda-payment-inline-hint">Adicione pagamentos até cobrir o total</span>
                    </div>

                    <div className="comanda-payment-inline-inputs">
                      <select
                        title="Forma de pagamento"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="comanda-payment-select"
                      >
                        <option value="cash">Dinheiro</option>
                        <option value="credit_card">Cartão Crédito</option>
                        <option value="debit_card">Cartão Débito</option>
                        <option value="pix">PIX</option>
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Valor"
                        value={currentPaymentAmount}
                        onChange={(e) => setCurrentPaymentAmount(e.target.value)}
                        className="comanda-payment-amount-input"
                      />

                      <button
                        type="button"
                        onClick={handleAddPayment}
                        className="comanda-payment-add-btn"
                        title="Adicionar forma de pagamento"
                      >
                        +
                      </button>
                    </div>

                    {payments.length > 0 && (
                      <div className="comanda-payment-items">
                        {payments.map((payment, index) => (
                          <div key={index} className="comanda-payment-item">
                            <span className="comanda-payment-item-method">
                              {getPaymentMethodLabel(payment.method)}
                            </span>
                            <span className="comanda-payment-item-amount">
                              {formatCurrency(payment.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePayment(index)}
                              className="comanda-payment-item-remove"
                              title="Remover"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="comanda-payment-status">
                      <div className="comanda-payment-status-row">
                        <span>Total a pagar</span>
                        <span className="comanda-payment-total">{formatCurrency(paymentSummary.totalToPay)}</span>
                      </div>
                      <div className="comanda-payment-status-row">
                        <span>Total pago</span>
                        <span className="comanda-payment-total">{formatCurrency(paymentSummary.totalPaid)}</span>
                      </div>
                      {paymentSummary.remaining > 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--missing">
                          <span>Faltando</span>
                          <span className="comanda-payment-missing">{formatCurrency(paymentSummary.remaining)}</span>
                        </div>
                      )}
                      {paymentSummary.change > 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--change">
                          <span>Troco</span>
                          <span className="comanda-payment-change">{formatCurrency(paymentSummary.change)}</span>
                        </div>
                      )}
                      {paymentSummary.isPaid && paymentSummary.change === 0 && (
                        <div className="comanda-payment-status-row comanda-payment-status-row--complete">
                          <span>✓ Pagamento completo</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="comanda-cart-buttons">
                  <button
                    onClick={handlePrintPreBill}
                    className="comanda-print-preview-button"
                    title="Imprimir pré-conta"
                  >
                    <Printer size={18} />
                    Pré-Conta
                  </button>
                  <button
                    onClick={handleCloseComanda}
                    className="comanda-checkout-button"
                    disabled={
                      selectedComanda.status !== 'OPEN' ||
                      selectedComanda.items.length === 0 ||
                      payments.length === 0 ||
                      paymentSummary.remaining > 0
                    }
                  >
                    <DollarSign size={18} />
                    Fechar e Pagar
                  </button>
                </div>
              </div>

              {selectedComanda.status === 'CLOSED' && (
                <div className="comanda-actions">
                  <Button
                    variant="secondary"
                    onClick={() => handleReopenComanda()}
                    style={{ width: '100%' }}
                  >
                    Reabrir Comanda
                  </Button>
                </div>
              )}

            </Card>
          </div>
        )}
      </div>

      {/* Open Comanda Modal */}
      <Modal
        isOpen={isOpenComandaModalOpen}
        title="Nova Comanda"
        onClose={() => setIsOpenComandaModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsOpenComandaModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleOpenComanda}>
              Abrir Comanda
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOpenComanda}>
          <div className="form-group">
            <label htmlFor="tableNumber">Número da Mesa (opcional)</label>
            <Input
              id="tableNumber"
              type="number"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Ex: 1"
              min="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerName">Nome do Cliente (opcional)</label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>
        </form>
      </Modal>

      {/* Draft Import Modal */}
      <Modal
        isOpen={isImportDraftModalOpen}
        title="Importar itens para Comanda"
        onClose={() => setIsImportDraftModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button variant="secondary" onClick={handleDiscardDraftImport}>
              Descartar
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                await openComandaAndMaybeImport();
              }}
            >
              Abrir comanda e importar
            </Button>
          </div>
        }
      >
        <div className="comanda-draft-import-body">
          <p>
            Encontramos itens salvos ao trocar de módulo. Deseja abrir uma comanda e importar esses itens?
          </p>
          <div>
            <strong>Itens:</strong> {draftToImport?.items?.length ?? 0}
          </div>
          {!currentSession?.id && (
            <Alert variant="warning">
              Nenhuma sessão de caixa aberta. Abra o caixa para importar.
            </Alert>
          )}
        </div>
      </Modal>

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
                      <span>
                        {n} sabor{n > 1 ? 'es' : ''}
                      </span>
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
                    <button type="button" onClick={() => removeAssembledFlavor(idx)} className="assembled-btn-cancel">
                      Remover
                    </button>
                  </div>
                ))}
                {assembledSelectedFlavors.length === 0 && (
                  <div style={{ color: 'rgba(0,0,0,0.6)' }}>Nenhum sabor selecionado</div>
                )}
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
              <div
                style={{
                  marginTop: 10,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 8,
                }}
              >
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
              <button onClick={confirmAssembledComanda} className="assembled-btn-confirm">
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
            <h2 className="sales-page__modal-title">Capturar Peso - {pendingWeightProduct?.name}</h2>
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
                value={tempWeight}
                onChange={(e) => setTempWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmWeightComanda();
                  }
                }}
                className="sales-page__weight-input"
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
              onClick={handleConfirmWeightComanda}
              className="sales-page__modal-button sales-page__modal-button--confirm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro de Cliente */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        title="Novo Cliente"
        onClose={() => setIsNewCustomerModalOpen(false)}
        footer={
          <div className="modal-footer">
            <Button
              variant="secondary"
              onClick={() => setIsNewCustomerModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateCustomer}
            >
              Cadastrar e Vincular
            </Button>
          </div>
        }
      >
        <form className="comanda-customer-form" onSubmit={handleCreateCustomer}>
          <div className="form-section">
            <h3 className="form-section-title">Dados Pessoais</h3>
            <div className="form-grid">
              <Input
                label="Nome *"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
              />
              <Input
                label="Telefone"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
              <Input
                label="WhatsApp"
                value={customerForm.whatsapp}
                onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })}
              />
              <Input
                label="CPF"
                value={customerForm.cpf}
                onChange={(e) => setCustomerForm({ ...customerForm, cpf: e.target.value })}
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Endereço (Opcional)</h3>
            <div className="form-grid">
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
              <Input
                label="Rua"
                value={customerForm.street}
                onChange={(e) => setCustomerForm({ ...customerForm, street: e.target.value })}
              />
              <Input
                label="Número"
                value={customerForm.number}
                onChange={(e) => setCustomerForm({ ...customerForm, number: e.target.value })}
              />
              <Input
                label="Bairro"
                value={customerForm.neighborhood}
                onChange={(e) => setCustomerForm({ ...customerForm, neighborhood: e.target.value })}
              />
              <Input
                label="Cidade"
                value={customerForm.city}
                onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
              />
              <Input
                label="Estado"
                value={customerForm.state}
                onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                maxLength={2}
                placeholder="UF"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ComandasPage;
