import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSalesStore, useCashSessionStore } from '@/store';
import { apiClient } from '@/services/api';
import { Card, Button, Modal, Loading, Alert, Badge } from '@/components/common';
import { Trash2, ShoppingCart, Plus, Minus, Printer } from 'lucide-react';
import { CepSearchInput, CepSearchFieldsDisplay } from '@/components/CepSearchInput';
import { printReceipt, formatCurrency, getPrintStyles } from '@/utils/printer';
import { clearCartDraft, loadCartDraft, saveCartDraft } from '@/utils/cartDraft';
import type { Product, Customer } from '@/types';
import type { AddressData } from '@/hooks/useGeolocation';
import './SalesPage.css';
import '@/styles/assembledModal.css';

export const SalesPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit_card' | 'debit_card' | 'pix'>('cash');
  const [payments, setPayments] = useState<Array<{ method: 'cash' | 'credit_card' | 'debit_card' | 'pix'; amount: number }>>([]);
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [couponDiscountValue, setCouponDiscountValue] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [pendingWeightProduct, setPendingWeightProduct] = useState<Product | null>(null);
  const [tempWeight, setTempWeight] = useState('');
  const [isReadingScale, setIsReadingScale] = useState(false);

  const [isAssembledModalOpen, setIsAssembledModalOpen] = useState(false);
  const [assembledCategoryId, setAssembledCategoryId] = useState<string>('');
  const [assembledSizeId, setAssembledSizeId] = useState<string>('');
  const [assembledFlavorsTotal, setAssembledFlavorsTotal] = useState<string>('1');
  const [assembledSelectedFlavors, setAssembledSelectedFlavors] = useState<Product[]>([]);
  const [assembledSearchTerm, setAssembledSearchTerm] = useState('');
  const [assembledGroupId, setAssembledGroupId] = useState<string>('');
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

  const salesStore = useSalesStore();
  const { currentSession, loadSession } = useCashSessionStore();

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

  const normalizeSearch = (value: unknown) => {
    const s = String(value ?? '').trim().toLowerCase();
    try {
      // Use RegExp constructor so older engines don't fail parsing on \p{}
      return s.normalize('NFD').replace(new RegExp('\\p{Diacritic}', 'gu'), '');
    } catch {
      // Fallback for environments without Unicode property escapes
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const draft = loadCartDraft();
    if (!draft || draft.mode !== 'pdv') return;

    if (draft.items.length > 0) {
      salesStore.setItems(draft.items);
    }
    setSelectedCustomer(draft.selectedCustomerId ?? '');
    setDiscountCode(draft.couponCode ?? '');
    setCouponDiscountValue(Number(draft.couponDiscountValue ?? 0));
    setDiscountValue(Number(draft.discountValue ?? 0));
    setAdditionalFee(Number(draft.additionalFee ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasDraftData =
      salesStore.items.length > 0 ||
      !!selectedCustomer ||
      !!discountCode ||
      couponDiscountValue > 0 ||
      discountValue > 0 ||
      additionalFee > 0;

    if (!hasDraftData) {
      const existing = loadCartDraft();
      if (existing?.mode === 'pdv') clearCartDraft();
      return;
    }

    saveCartDraft({
      mode: 'pdv',
      items: salesStore.items,
      selectedCustomerId: selectedCustomer || undefined,
      couponCode: discountCode || undefined,
      couponDiscountValue,
      discountValue,
      additionalFee,
    });
  }, [salesStore.items, selectedCustomer, discountCode, couponDiscountValue, discountValue, additionalFee]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.querySelector('.sales-page__customer-search-group');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
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
      const [productsResponse, customersResponse] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getCustomers(),
        loadSession(),
      ]);
      setProducts(productsResponse.data || productsResponse);
      setCustomers(customersResponse.data || customersResponse);
    } catch (err) {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSale = () => {
    const hasData =
      salesStore.items.length > 0 ||
      !!selectedCustomer ||
      !!discountCode ||
      couponDiscountValue > 0 ||
      discountValue > 0 ||
      additionalFee > 0 ||
      payments.length > 0;

    if (hasData) {
      const ok = window.confirm('Cancelar venda e limpar todos os dados do PDV?');
      if (!ok) return;
    }

    salesStore.clear();
    setSelectedCustomer('');
    setCustomerSearchTerm('');
    setIsCustomerSearchOpen(false);

    setDiscountCode('');
    setCouponDiscountValue(0);
    setDiscountValue(0);
    setAdditionalFee(0);

    setPayments([]);
    setPaymentMethod('cash');
    setCurrentPaymentAmount('');
    setIsCheckoutModalOpen(false);

    setWeightInputs({});
    setIsWeightModalOpen(false);
    setPendingWeightProduct(null);
    setTempWeight('');

    clearCartDraft();
    setSuccess('Venda cancelada');
    setTimeout(() => setSuccess(null), 2000);
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return [];

    const search = customerSearchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(search) ||
        c.phone?.includes(search) ||
        c.cpf?.includes(search) ||
        c.whatsapp?.includes(search) ||
        c.email?.toLowerCase().includes(search)
    ).slice(0, 8);
  }, [customers, customerSearchTerm]);

  const filteredProducts = useMemo(() => {
    const term = normalizeSearch(productSearchTerm);
    if (!term) return products;

    return products.filter((p) => {
      const name = normalizeSearch(p.name);
      const code = normalizeSearch(p.code);
      return name.includes(term) || (!!code && code.includes(term));
    });
  }, [products, productSearchTerm]);

  const handleAddItem = (product: Product) => {
    const isWeight = product.saleType === 'weight';
    const category = getProductCategory(product);
    const isAssembled = category?.categoryType === 'assembled';
    
    if (isWeight) {
      setPendingWeightProduct(product);
      setTempWeight('');
      setIsWeightModalOpen(true);
    } else if (isAssembled) {
      const sizes = Array.isArray(category?.sizes) ? category.sizes : [];
      if (sizes.length === 0) {
        setError('Categoria Montado sem tamanhos cadastrados');
        setTimeout(() => setError(null), 3000);
        return;
      }
      const initialSizeId = String(sizes[0].id);
      setAssembledCategoryId(String(category.id));
      setAssembledSizeId(initialSizeId);
      setAssembledFlavorsTotal('1');
      setAssembledSelectedFlavors([product]);
      setAssembledSearchTerm('');
      setAssembledGroupId(newGroupId());
      setIsAssembledModalOpen(true);
    } else {
      const unitPrice = typeof product.salePrice === 'number' ? product.salePrice : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0);
      salesStore.addItem({
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        saleType: product.saleType,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
      });
    }
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

        salesStore.addItem({
          id: `${p.id}-${assembledGroupId}-${idx}-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          saleType: p.saleType,
          quantity: 1,
          unitPrice,
          totalPrice: unitPrice,
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

    for (const item of salesStore.items as any[]) {
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
  }, [salesStore.items]);

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

  const handleConfirmWeight = () => {
    if (!pendingWeightProduct) return;

    const weight = parseWeightInput(tempWeight);

    if (isNaN(weight) || weight <= 0) {
      setError('Peso inválido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const unitPrice =
      typeof pendingWeightProduct.salePrice === 'number'
        ? pendingWeightProduct.salePrice
        : parseFloat(pendingWeightProduct.salePrice as any) || 0;

    const totalPrice = unitPrice * weight;

    salesStore.addItem({
      id: `${pendingWeightProduct.id}-${Date.now()}`,
      productId: pendingWeightProduct.id,
      productName: pendingWeightProduct.name,
      saleType: pendingWeightProduct.saleType,
      quantity: weight,
      unitPrice,
      totalPrice,
    });

    setSuccess(`${pendingWeightProduct.name} adicionado ao carrinho!`);
    setTimeout(() => setSuccess(null), 2000);

    setIsWeightModalOpen(false);
    setPendingWeightProduct(null);
    setTempWeight('');
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

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      salesStore.updateItem(itemId, quantity);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    salesStore.removeItem(itemId);
  };

  const getCustomerName = (): string => {
    if (!selectedCustomer) return 'Consumidor Final';
    const found = customers.find((c: any) => String((c as any)?.id) === String(selectedCustomer));
    return (found as any)?.name || 'Cliente';
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response: any = await apiClient.post('/customers', customerForm);
      const newCustomer = response?.data || response;

      const customersResponse: any = await apiClient.getCustomers();
      setCustomers(customersResponse?.data || customersResponse || []);

      if (newCustomer?.id) {
        setSelectedCustomer(String(newCustomer.id));
      }

      setIsNewCustomerModalOpen(false);
      setCustomerSearchTerm('');
      setIsCustomerSearchOpen(false);
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

      setSuccess('Cliente cadastrado com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao cadastrar cliente');
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
    if (!discountCode) return;
    try {
      // Calcular subtotal para validação
      const sale_subtotal = salesStore.items.reduce((sum, item) => sum + item.totalPrice, 0);
      
      const response = await apiClient.validateCoupon(discountCode, sale_subtotal, selectedCustomer || '');
      const discount = response.data?.discountAmount ?? response.discountAmount;
      if (discount !== undefined && discount !== null) {
        setCouponDiscountValue(toMoneyNumber(discount));
        setSuccess('Cupom aplicado com sucesso!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      let errorMsg = 'Cupom inválido';
      if (err?.response?.status === 404) {
        errorMsg = 'Cupom não encontrado';
      } else if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSwitchMode = (target: 'pdv' | 'comanda' | 'delivery') => {
    saveCartDraft({
      mode: target,
      items: salesStore.items,
      selectedCustomerId: selectedCustomer || undefined,
      couponCode: discountCode || undefined,
      couponDiscountValue,
      discountValue,
      additionalFee,
    });

    if (target === 'delivery') navigate('/delivery');
    else if (target === 'comanda') navigate('/comandas');
    else navigate('/sales');
  };

  const { subtotal, total } = useMemo(() => {
    const subtotal = salesStore.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = couponDiscountValue + discountValue;
    const total = subtotal + additionalFee - totalDiscount;
    return { subtotal, total: Math.max(0, total) };
  }, [salesStore.items, couponDiscountValue, discountValue, additionalFee]);

  const { totalPaid, missingAmount, changeAmount } = useMemo(() => {
    const totalPaidCalc = payments.reduce((sum, p) => sum + p.amount, 0);
    const missing = Math.max(0, total - totalPaidCalc);
    const change = Math.max(0, totalPaidCalc - total);
    return {
      totalPaid: parseFloat(totalPaidCalc.toFixed(2)),
      missingAmount: parseFloat(missing.toFixed(2)),
      changeAmount: parseFloat(change.toFixed(2)),
    };
  }, [payments, total]);

  const handleAddPayment = () => {
    const parsed = parseFloat(currentPaymentAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setError('Digite um valor de pagamento válido');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setPayments([...payments, { method: paymentMethod, amount: parseFloat(parsed.toFixed(2)) }]);
    setCurrentPaymentAmount('');
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão Crédito',
      debit_card: 'Cartão Débito',
      pix: 'PIX',
    };
    return labels[method] || method;
  };

  const handlePrintPreview = () => {
    if (salesStore.items.length === 0) {
      setError('Nenhum item no carrinho para imprimir');
      setTimeout(() => setError(null), 2500);
      return;
    }

    const customerName = getCustomerName();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');

    const itemsHTML = salesStore.items.map((item) => {
      const qtyLabel = item.saleType === 'weight'
        ? `${item.quantity.toFixed(3)} kg`
        : `${item.quantity}x`;
      const unit = formatCurrency(item.unitPrice);
      const lineTotal = formatCurrency(item.totalPrice);
      return `
        <tr>
          <td class="print-table-item-name">
            <div>${item.productName}</div>
            <div class="print-table-item-detail">${qtyLabel} · ${unit}</div>
          </td>
          <td class="print-table-col-qty">${qtyLabel}</td>
          <td class="print-table-col-total">${lineTotal}</td>
        </tr>
      `;
    }).join('');

    const paymentsHTML = payments.length > 0 ? `
      <div class="print-section">
        <div class="print-section-title">Formas de Pagamento</div>
        ${payments.map((p) => `
          <div class="print-row">
            <span class="print-row-label">${getPaymentMethodLabel(p.method)}</span>
            <span class="print-row-value">${formatCurrency(p.amount)}</span>
          </div>
        `).join('')}
        <div class="print-row highlight total">
          <span class="print-row-label">Total Pago</span>
          <span class="print-row-value">${formatCurrency(totalPaid)}</span>
        </div>
        ${missingAmount > 0 ? `
          <div class="print-row" style="color: #d32f2f;">
            <span class="print-row-label">⚠️ Falta</span>
            <span class="print-row-value">${formatCurrency(missingAmount)}</span>
          </div>
        ` : ''}
        ${changeAmount > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Troco</span>
            <span class="print-row-value">${formatCurrency(changeAmount)}</span>
          </div>
        ` : ''}
      </div>
    ` : '';

    const content = `
      <div class="print-section">
        <div class="print-row">
          <span class="print-row-label"><strong>Cliente:</strong></span>
          <span class="print-row-value">${customerName}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Data/Hora:</span>
          <span class="print-row-value">${dateStr} ${timeStr}</span>
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
          <span class="print-row-value">${formatCurrency(subtotal)}</span>
        </div>
        ${additionalFee > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Acréscimo:</span>
            <span class="print-row-value">${formatCurrency(additionalFee)}</span>
          </div>
        ` : ''}
        ${(couponDiscountValue + discountValue) > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(couponDiscountValue + discountValue)}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(total)}</span>
        </div>
      </div>

      ${paymentsHTML}

      <div class="print-footer">
        <div class="print-footer-text">Prévia para conferência do cliente</div>
        <div class="print-footer-line">{{FOOTER_TEXT}}</div>
        <div class="print-footer-line">{{FOOTER_SECONDARY}}</div>
      </div>
    `;

    printReceipt({
      title: 'Pré-Conta',
      subtitle: 'Venda PDV',
      content
    });
  };

  const handlePrintFinalReceipt = (params: {
    items: typeof salesStore.items;
    payments: typeof payments;
    subtotal: number;
    total: number;
    additionalFee: number;
    discountValue: number;
    customerName: string;
    dateStr: string;
    timeStr: string;
  }) => {
    const itemsHTML = params.items.map((item) => {
      const qtyLabel = item.saleType === 'weight'
        ? `${item.quantity.toFixed(3)} kg`
        : `${item.quantity}x`;
      const unit = formatCurrency(item.unitPrice);
      const lineTotal = formatCurrency(item.totalPrice);
      return `
        <tr>
          <td class="print-table-item-name">
            <div>${item.productName}</div>
            <div class="print-table-item-detail">${qtyLabel} · ${unit}</div>
          </td>
          <td class="print-table-col-qty">${qtyLabel}</td>
          <td class="print-table-col-total">${lineTotal}</td>
        </tr>
      `;
    }).join('');

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

    const content = `
      <div class="print-section">
        <div class="print-row">
          <span class="print-row-label"><strong>Cliente:</strong></span>
          <span class="print-row-value">${params.customerName}</span>
        </div>
        <div class="print-row">
          <span class="print-row-label">Data/Hora:</span>
          <span class="print-row-value">${params.dateStr} ${params.timeStr}</span>
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
          <span class="print-row-value">${formatCurrency(params.subtotal)}</span>
        </div>
        ${params.additionalFee > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Acréscimo:</span>
            <span class="print-row-value">${formatCurrency(params.additionalFee)}</span>
          </div>
        ` : ''}
        ${params.discountValue > 0 ? `
          <div class="print-row">
            <span class="print-row-label">Desconto:</span>
            <span class="print-row-value">-${formatCurrency(params.discountValue)}</span>
          </div>
        ` : ''}
        <div class="print-row total highlight">
          <span class="print-row-label">TOTAL:</span>
          <span class="print-row-value">${formatCurrency(params.total)}</span>
        </div>
      </div>

      ${paymentsHTML}

      <div class="print-footer">
        <div class="print-footer-text">{{FOOTER_TEXT}}</div>
        <div class="print-footer-line">{{FOOTER_SECONDARY}}</div>
      </div>
    `;

    printReceipt({
      title: 'Cupom de Venda',
      subtitle: 'Fechamento PDV',
      content,
    });
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    try {
      if (!currentSession || currentSession.status !== 'open') {
        setError('Nenhum caixa aberto. Abra um caixa para continuar.');
        return;
      }

      if (salesStore.items.length === 0) {
        setError('Adicione itens ao carrinho');
        return;
      }

      if (payments.length === 0) {
        setError('Adicione ao menos uma forma de pagamento');
        return;
      }

      if (Math.abs(totalPaid - total) > 0.01) {
        setError(`Valor pago (R$ ${totalPaid.toFixed(2)}) diferente do total (R$ ${total.toFixed(2)})`);
        return;
      }

      const totalDiscount = couponDiscountValue + discountValue;

      await apiClient.createSale({
        cashSessionId: currentSession.id,
        customerId: selectedCustomer || undefined,
        saleType: 'pdv',
        items: salesStore.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discount: 0,
          ...(item.sizeId
            ? { sizeId: item.sizeId, flavorsTotal: item.flavorsTotal ?? 1 }
            : { unitPrice: item.unitPrice }),
        })),
        payments: payments.map((p) => ({ paymentMethod: p.method, amount: p.amount })),
        discount: totalDiscount,
        deliveryFee: 0,
        additionalFee,
        loyaltyPointsUsed: 0,
      });

      const now = new Date();
      handlePrintFinalReceipt({
        items: salesStore.items,
        payments,
        subtotal,
        total,
        additionalFee,
        discountValue: totalDiscount,
        customerName: getCustomerName(),
        dateStr: now.toLocaleDateString('pt-BR'),
        timeStr: now.toLocaleTimeString('pt-BR'),
      });

      setSuccess('Venda finalizada com sucesso!');
      salesStore.clear();
      clearCartDraft();
      setSelectedCustomer('');
      setDiscountCode('');
      setCouponDiscountValue(0);
      setDiscountValue(0);
      setAdditionalFee(0);
      setPaymentMethod('cash');
      setPayments([]);
      setCurrentPaymentAmount('');
      setIsCheckoutModalOpen(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao finalizar venda');
    }
  };

  if (loading) return <Loading message="Carregando..." />;

  return (
    <div className="sales-page">
      <div className="sales-page__header">
        <ShoppingCart size={32} />
        <h1 className="sales-page__title">Sistema de Vendas</h1>
      </div>

      {error && (
        <div className="sales-page__alert sales-page__alert--danger">
          {error}
          <button onClick={() => setError(null)} className="sales-page__alert-close">✕</button>
        </div>
      )}
      {success && (
        <div className="sales-page__alert sales-page__alert--success">
          {success}
          <button onClick={() => setSuccess(null)} className="sales-page__alert-close">✕</button>
        </div>
      )}

      <div className="sales-page__grid">
        {/* Products */}
        <div className="sales-page__products">
          <div className="sales-page__products-header">
            <h2 className="sales-page__products-title">Produtos</h2>
            <input
              className="sales-page__product-search"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              placeholder="Buscar produto (nome ou código)…"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const first = filteredProducts[0];
                if (!first) return;
                handleAddItem(first);
                setProductSearchTerm('');
              }}
            />
            <span className="sales-page__products-hint">Clique para adicionar ao carrinho</span>
          </div>
          <div className="sales-page__products-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="sales-page__product-card"
                onClick={() => handleAddItem(product)}
              >
                <div className="sales-page__product-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="sales-page__product-image-img"
                    />
                  ) : (
                    '🍦'
                  )}
                </div>
                <p className="sales-page__product-name">{product.name}</p>
                <p className="sales-page__product-price">R$ {(typeof product.salePrice === 'number' ? product.salePrice : (typeof product.salePrice === 'string' ? parseFloat(product.salePrice) : 0)).toFixed(2)}</p>
                <span
                  className={`sales-page__product-status ${
                    product.isActive
                      ? 'sales-page__product-status--available'
                      : 'sales-page__product-status--unavailable'
                  }`}
                >
                  {product.isActive ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="sales-page__cart">
          <div className="sales-page__cart-title-row">
            <h2 className="sales-page__cart-title">Carrinho</h2>
            <div className="sales-page__cart-title-actions">
              <select
                title="Trocar módulo mantendo itens"
                value="pdv"
                onChange={(e) => handleSwitchMode(e.target.value as any)}
                className="sales-page__cart-mode-select"
              >
                <option value="pdv">PDV</option>
                <option value="comanda">Comanda</option>
                <option value="delivery">Delivery</option>
              </select>
              <button
                type="button"
                onClick={handleCancelSale}
                className="sales-page__cart-cancel-sale-btn"
                title="Cancelar venda e limpar tudo"
              >
                Cancelar venda
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="sales-page__cart-items">
            {salesStore.items.length === 0 ? (
              <p className="sales-page__cart-empty">Nenhum item selecionado</p>
            ) : (
              groupedCartItems.map((entry) => {
                if (entry.kind === 'group') {
                  const title = `Montado${entry.sizeLabel ? ` - ${entry.sizeLabel}` : ''} (${entry.flavorsTotal} sabor(es))`;
                  return (
                    <div key={`group-${entry.groupId}`} className="sales-page__cart-item">
                      <div className="sales-page__cart-item-info">
                        <p className="sales-page__cart-item-name">{title}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                          {entry.items.map((it) => (
                            <div
                              key={it.id}
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}
                            >
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
                        <div className="sales-page__cart-item-controls" style={{ marginTop: 10 }}>
                          <span className="sales-page__cart-item-total">R$ {entry.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => entry.items.forEach((it) => handleRemoveItem(it.id))}
                        className="sales-page__cart-item-remove"
                        title="Remover item montado"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                }

                const item = entry.item;
                return (
                  <div key={item.id} className="sales-page__cart-item">
                    <div className="sales-page__cart-item-info">
                      <p className="sales-page__cart-item-name">{item.productName}</p>
                      <div className="sales-page__cart-item-controls">
                        {item.saleType === 'weight' ? (
                          <>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 0.1)}
                              className="sales-page__cart-item-btn"
                              title="Diminuir quantidade (peso)"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="text"
                              title="Quantidade em kg (ex: 1,500)"
                              placeholder="0,000"
                              value={
                                weightInputs[item.id] !== undefined
                                  ? weightInputs[item.id]
                                  : item.quantity.toFixed(3).replace('.', ',')
                              }
                              onChange={(e) => {
                                setWeightInputs({ ...weightInputs, [item.id]: e.target.value });
                              }}
                              onBlur={(e) => {
                                const val = e.target.value.replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '');
                                const raw = val.replace(',', '.');
                                const parsed = parseFloat(raw);
                                if (!isNaN(parsed) && parsed > 0) {
                                  handleUpdateQuantity(item.id, parsed);
                                }
                                setWeightInputs({ ...weightInputs, [item.id]: undefined });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="sales-page__cart-item-quantity"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 0.1)}
                              className="sales-page__cart-item-btn"
                              title="Aumentar quantidade (peso)"
                            >
                              <Plus size={14} />
                            </button>
                            <span className="sales-page__cart-item-total">
                              R$ {(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="sales-page__cart-item-btn"
                              title="Diminuir quantidade"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              title="Quantidade do item"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                              className="sales-page__cart-item-quantity"
                            />
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="sales-page__cart-item-btn"
                              title="Aumentar quantidade"
                            >
                              <Plus size={14} />
                            </button>
                            <span className="sales-page__cart-item-total">
                              R$ {(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="sales-page__cart-item-remove"
                      title="Remover item do carrinho"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Customer & Discount */}
          {salesStore.items.length > 0 && (
            <>
              <div className="sales-page__customer-search-group">
                <label className="sales-page__cart-section-label">Cliente (Opcional)</label>
                
                {selectedCustomer && (
                  <div className="sales-page__customer-selected">
                    {getCustomerName()}
                    <button
                      onClick={() => {
                        setSelectedCustomer('');
                        setCustomerSearchTerm('');
                      }}
                      className="sales-page__customer-remove"
                      title="Remover cliente selecionado"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="sales-page__customer-search-input-wrapper">
                  <input
                    type="text"
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setIsCustomerSearchOpen(true);
                    }}
                    onFocus={() => setIsCustomerSearchOpen(true)}
                    placeholder="Buscar cliente por nome, CPF ou telefone..."
                    className="sales-page__customer-search-input"
                  />
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="sales-page__customer-add-button"
                    title="Cadastrar novo cliente"
                  >
                    +
                  </button>

                  {isCustomerSearchOpen && (
                    <div className="sales-page__customer-search-results">
                      {filteredCustomers.length > 0 ? (
                        <>
                          {filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => {
                                setSelectedCustomer(customer.id);
                                setCustomerSearchTerm('');
                                setIsCustomerSearchOpen(false);
                              }}
                              className="sales-page__customer-search-item"
                            >
                              <span className="sales-page__customer-search-item-name">
                                {customer.name}
                              </span>
                              <span className="sales-page__customer-search-item-info">
                                {customer.cpf || customer.phone}
                              </span>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setSelectedCustomer('');
                              setCustomerSearchTerm('');
                              setIsCustomerSearchOpen(false);
                            }}
                            className="sales-page__customer-search-item sales-page__customer-search-item--final"
                          >
                            Consumidor Final
                          </button>
                        </>
                      ) : customerSearchTerm ? (
                        <div className="sales-page__customer-search-empty">
                          Nenhum cliente encontrado
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="sales-page__cart-section">
                <label className="sales-page__cart-section-label">Cupom</label>
                <div className="sales-page__cart-coupon-inputs">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Código do cupom"
                    className="sales-page__cart-coupon-input"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="sales-page__cart-coupon-button"
                  >
                    Aplicar
                  </button>
                </div>
              </div>

              <div className="sales-page__cart-section">
                <label className="sales-page__cart-section-label">Acréscimo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={additionalFee}
                  onChange={(e) => setAdditionalFee(toMoneyNumber(e.target.value))}
                  placeholder="0,00"
                  className="sales-page__cart-coupon-input"
                />
              </div>

              <div className="sales-page__cart-section">
                <label className="sales-page__cart-section-label">Desconto Geral (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(toMoneyNumber(e.target.value))}
                  placeholder="0,00"
                  className="sales-page__cart-coupon-input"
                />
              </div>
            </>
          )}

          {/* Totals */}
          {salesStore.items.length > 0 && (
            <div className="sales-page__cart-totals">
              <div className="sales-page__cart-totals-row">
                <span className="sales-page__cart-totals-label">Subtotal:</span>
                <span className="sales-page__cart-totals-value">R$ {subtotal.toFixed(2)}</span>
              </div>
              {additionalFee > 0 && (
                <div className="sales-page__cart-totals-row">
                  <span className="sales-page__cart-totals-label">Acréscimo:</span>
                  <span className="sales-page__cart-totals-value">R$ {additionalFee.toFixed(2)}</span>
                </div>
              )}
              {couponDiscountValue + discountValue > 0 && (
                <div className="sales-page__cart-totals-row sales-page__cart-totals-row--discount">
                  <span className="sales-page__cart-totals-label">Desconto:</span>
                  <span className="sales-page__cart-totals-value">-R$ {(couponDiscountValue + discountValue).toFixed(2)}</span>
                </div>
              )}
              <div className="sales-page__cart-totals-row sales-page__cart-totals-row--final">
                <span className="sales-page__cart-totals-label">Total:</span>
                <span className="sales-page__cart-totals-value">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {salesStore.items.length > 0 && (
            <div className="sales-page__payment-section">
              <h3 className="sales-page__payment-title">Pagamentos</h3>

              <div className="sales-page__payment-input-group">
                <select
                  title="Selecione a forma de pagamento"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="sales-page__payment-select"
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
                  className="sales-page__payment-amount-input"
                />

                <button
                  onClick={handleAddPayment}
                  className="sales-page__payment-add-btn"
                >
                  +
                </button>
              </div>

              {payments.length > 0 && (
                <div className="sales-page__payment-items">
                  {payments.map((p, index) => (
                    <div key={`${p.method}-${index}`} className="sales-page__payment-item">
                      <span className="sales-page__payment-item-method">
                        {p.method === 'cash'
                          ? 'Dinheiro'
                          : p.method === 'credit_card'
                            ? 'Cartão Crédito'
                            : p.method === 'debit_card'
                              ? 'Cartão Débito'
                              : 'PIX'}
                      </span>
                      <span className="sales-page__payment-item-amount">R$ {p.amount.toFixed(2)}</span>
                      <button
                        onClick={() => handleRemovePayment(index)}
                        className="sales-page__payment-item-remove"
                        title="Remover pagamento"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="sales-page__payment-status">
                <div className="sales-page__payment-status-row">
                  <span>Total da venda</span>
                  <span className="sales-page__payment-total">R$ {total.toFixed(2)}</span>
                </div>
                <div className="sales-page__payment-status-row">
                  <span>Total pago</span>
                  <span className="sales-page__payment-total">R$ {totalPaid.toFixed(2)}</span>
                </div>
                {missingAmount > 0 && (
                  <div className="sales-page__payment-status-row sales-page__payment-status-row--missing">
                    <span>Falta pagar</span>
                    <span className="sales-page__payment-missing">R$ {missingAmount.toFixed(2)}</span>
                  </div>
                )}
                {changeAmount > 0 && (
                  <div className="sales-page__payment-status-row sales-page__payment-status-row--change">
                    <span>Troco</span>
                    <span className="sales-page__payment-change">R$ {changeAmount.toFixed(2)}</span>
                  </div>
                )}
                {missingAmount === 0 && changeAmount === 0 && payments.length > 0 && (
                  <div className="sales-page__payment-status-row sales-page__payment-status-row--complete">
                    <span>Pagamento completo</span>
                    <span className="sales-page__payment-total">OK</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {salesStore.items.length > 0 && (
            <div className="sales-page__cart-buttons">
              <button
                onClick={handlePrintPreview}
                className="sales-page__print-preview-button"
                title="Imprimir pré-conta para o cliente"
              >
                <Printer size={18} /> Pré-conta
              </button>
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="sales-page__checkout-button"
              >
                Finalizar Venda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Customer Modal */}
      <div className={`sales-page__modal ${isNewCustomerModalOpen ? 'sales-page__modal--open' : ''}`}>
        <div className="sales-page__modal-overlay" onClick={() => setIsNewCustomerModalOpen(false)} />
        <div className="sales-page__modal-content sales-page__modal-content--large">
          <div className="sales-page__modal-header">
            <h2 className="sales-page__modal-title">Cadastrar Novo Cliente</h2>
            <button
              onClick={() => setIsNewCustomerModalOpen(false)}
              className="sales-page__modal-close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateCustomer} className="sales-page__customer-form">
            <div className="sales-page__form-section">
              <h3 className="sales-page__form-section-title">Informações Pessoais</h3>
              
              <div className="sales-page__form-group">
                <label className="sales-page__form-label">Nome *</label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                  className="sales-page__form-input"
                  placeholder="Nome completo"
                />
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">CPF</label>
                  <input
                    type="text"
                    value={customerForm.cpf}
                    onChange={(e) => setCustomerForm({...customerForm, cpf: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Data de Nascimento</label>
                  <input
                    type="date"
                    value={customerForm.birthDate}
                    onChange={(e) => setCustomerForm({...customerForm, birthDate: e.target.value})}
                    className="sales-page__form-input"
                    title="Data de nascimento"
                    placeholder="Data de nascimento"
                  />
                </div>
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Telefone</label>
                  <input
                    type="tel"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">WhatsApp</label>
                  <input
                    type="tel"
                    value={customerForm.whatsapp}
                    onChange={(e) => setCustomerForm({...customerForm, whatsapp: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="sales-page__form-group">
                <label className="sales-page__form-label">Email</label>
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  className="sales-page__form-input"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>

            <div className="sales-page__form-section">
              <h3 className="sales-page__form-section-title">Endereço</h3>
              
              <div className="sales-page__form-group" style={{ marginBottom: '12px' }}>
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
                <div style={{ marginBottom: '12px' }}>
                  <CepSearchFieldsDisplay address={cepAddressData} showCoordinates={false} />
                </div>
              )}
              
              <div className="sales-page__form-row">
                <div className="sales-page__form-group sales-page__form-group--flex">
                  <label className="sales-page__form-label">Rua</label>
                  <input
                    type="text"
                    value={customerForm.street}
                    onChange={(e) => setCustomerForm({...customerForm, street: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="Rua"
                    title="Nome da rua"
                  />
                </div>
                <div className="sales-page__form-group sales-page__form-group--small">
                  <label className="sales-page__form-label">Nº</label>
                  <input
                    type="text"
                    value={customerForm.number}
                    onChange={(e) => setCustomerForm({...customerForm, number: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="123"
                    title="Número do endereço"
                  />
                </div>
              </div>

              <div className="sales-page__form-group">
                <label className="sales-page__form-label">Complemento</label>
                <input
                  type="text"
                  value={customerForm.complement}
                  onChange={(e) => setCustomerForm({...customerForm, complement: e.target.value})}
                  className="sales-page__form-input"
                  placeholder="Apto, sala, etc"
                />
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Bairro</label>
                  <input
                    type="text"
                    value={customerForm.neighborhood}
                    onChange={(e) => setCustomerForm({...customerForm, neighborhood: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="Bairro"
                  />
                </div>
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Cidade</label>
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="Cidade"
                  />
                </div>
              </div>

              <div className="sales-page__form-row">
                <div className="sales-page__form-group">
                  <label className="sales-page__form-label">Estado</label>
                  <input
                    type="text"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({...customerForm, state: e.target.value})}
                    className="sales-page__form-input"
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="sales-page__modal-footer">
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="sales-page__modal-button sales-page__modal-button--cancel"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="sales-page__modal-button sales-page__modal-button--confirm"
              >
                Cadastrar Cliente
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Checkout Modal */}
      <div className={`sales-page__modal ${isCheckoutModalOpen ? 'sales-page__modal--open' : ''}`}>
        <div className="sales-page__modal-overlay" onClick={() => setIsCheckoutModalOpen(false)} />
        <div className="sales-page__modal-content">
          <div className="sales-page__modal-header">
            <h2 className="sales-page__modal-title">Confirmar Venda</h2>
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="sales-page__modal-close"
            >
              ✕
            </button>
          </div>

          <div className="sales-page__modal-body">
            <div className="sales-page__modal-row">
              <span className="sales-page__modal-label">Subtotal:</span>
              <span className="sales-page__modal-value">R$ {subtotal.toFixed(2)}</span>
            </div>
            {additionalFee > 0 && (
              <div className="sales-page__modal-row">
                <span className="sales-page__modal-label">Acréscimo:</span>
                <span className="sales-page__modal-value">R$ {additionalFee.toFixed(2)}</span>
              </div>
            )}
            {couponDiscountValue + discountValue > 0 && (
              <div className="sales-page__modal-row sales-page__modal-row--discount">
                <span className="sales-page__modal-label">Desconto:</span>
                <span className="sales-page__modal-value">-R$ {(couponDiscountValue + discountValue).toFixed(2)}</span>
              </div>
            )}
            <div className="sales-page__modal-row sales-page__modal-row--total">
              <span className="sales-page__modal-label">Total a Pagar:</span>
              <span className="sales-page__modal-value">R$ {total.toFixed(2)}</span>
            </div>

            <div className="sales-page__selected-payments">
              <p className="sales-page__selected-payments-title">Pagamentos Selecionados</p>
              {payments.length === 0 && <div>Nenhum pagamento adicionado</div>}
              {payments.map((p, index) => (
                <div key={`${p.method}-${index}`} className="sales-page__selected-payment-item">
                  <span className="sales-page__selected-payment-method">
                    {p.method === 'cash'
                      ? 'Dinheiro'
                      : p.method === 'credit_card'
                        ? 'Cartão Crédito'
                        : p.method === 'debit_card'
                          ? 'Cartão Débito'
                          : 'PIX'}
                  </span>
                  <span className="sales-page__selected-payment-amount">R$ {p.amount.toFixed(2)}</span>
                </div>
              ))}

              <div className="sales-page__selected-payment-total">
                <span>Total Pago</span>
                <span>R$ {totalPaid.toFixed(2)}</span>
              </div>
              {missingAmount > 0 && (
                <div className="sales-page__selected-payment-missing">
                  <span>Falta</span>
                  <span>R$ {missingAmount.toFixed(2)}</span>
                </div>
              )}
              {changeAmount > 0 && (
                <div className="sales-page__selected-payment-change">
                  <span>Troco</span>
                  <span>R$ {changeAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="sales-page__modal-footer">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="sales-page__modal-button sales-page__modal-button--cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleCheckout}
              className="sales-page__modal-button sales-page__modal-button--confirm"
            >
              Confirmar Venda
            </button>
          </div>
        </div>
      </div>

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
            <h2 className="sales-page__modal-title">Capturar Peso - {pendingWeightProduct?.name}</h2>
            <button
              onClick={() => setIsWeightModalOpen(false)}
              className="sales-page__modal-close"
            >
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
                    handleConfirmWeight();
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
              onClick={handleConfirmWeight}
              className="sales-page__modal-button sales-page__modal-button--confirm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
