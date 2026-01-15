import React, { useState, useEffect } from 'react';
import { useAddressByCep, type AddressData } from '@/hooks/useGeolocation';
import { Input, Button, Alert } from '@/components/common';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export interface CepSearchInputProps {
  onAddressFound?: (address: AddressData) => void;
  onError?: (error: string) => void;
  onClear?: () => void;
  onCepChange?: (cep: string) => void;
  initialCep?: string;
  disabled?: boolean;
  label?: string;
  showCoordinates?: boolean;
  className?: string;
}

export function CepSearchInput({
  onAddressFound,
  onError,
  onClear,
  onCepChange,
  initialCep = '',
  disabled = false,
  label = 'CEP',
  showCoordinates = false,
  className = '',
}: CepSearchInputProps) {
  const [cepInput, setCepInput] = useState(initialCep);
  const { searchCep, clearAddress, addressData, loading, error } =
    useAddressByCep();
  const [searched, setSearched] = useState(false);

  // Sync when parent changes initialCep (e.g. editing an existing customer)
  useEffect(() => {
    const clean = String(initialCep || '').replace(/\D/g, '').slice(0, 8);
    const formatted = clean.length > 5 ? clean.slice(0, 5) + '-' + clean.slice(5) : clean;
    setCepInput(formatted);
    // If initial CEP changed, reset prior search result
    setSearched(false);
    clearAddress();
  }, [initialCep, clearAddress]);

  // Callback quando endereço é encontrado
  useEffect(() => {
    if (addressData) {
      onAddressFound?.(addressData);
      setSearched(true);
    }
  }, [addressData, onAddressFound]);

  // Callback quando há erro
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleSearch = async () => {
    const result = await searchCep(cepInput);
    setSearched(true);
  };

  const handleClear = () => {
    setCepInput('');
    clearAddress();
    setSearched(false);
    onCepChange?.('');
    onClear?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    // Formatar como: XXXXX-XXX
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5, 8);
    }
    setCepInput(value);

    const cleanValue = value.replace(/\D/g, '').slice(0, 8);
    onCepChange?.(cleanValue);

    // Limpar resultado quando usuário digita novo CEP
    const cleanInitial = String(initialCep || '').replace(/\D/g, '').slice(0, 8);
    if (searched && cleanValue !== cleanInitial) {
      setSearched(false);
      clearAddress();
    }
  };

  return (
    <div className={`w-full space-y-3 ${className}`}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
            {label}
          </label>
          <input
            type="text"
            value={cepInput}
            onChange={handleCepChange}
            onKeyPress={handleKeyPress}
            placeholder="00000-000"
            maxLength={9}
            disabled={disabled || loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontFamily: 'monospace',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
          <button
            onClick={handleSearch}
            disabled={disabled || loading || cepInput.replace(/\D/g, '').length !== 8}
            style={{
              padding: '8px 12px',
              backgroundColor: loading ? '#e5e7eb' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || disabled ? 'not-allowed' : 'pointer',
              opacity: loading || disabled ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '⏳' : 'Buscar'}
          </button>
          {addressData && (
            <button
              onClick={handleClear}
              disabled={disabled}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                border: 'none',
                borderRadius: '4px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && searched && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Endereço encontrado */}
      {addressData && !error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '4px',
            color: '#166534',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: '600', margin: 0, marginBottom: '4px' }}>
                {addressData.logradouro}
              </p>
              <p style={{ fontSize: '13px', margin: 0, color: '#4b5563' }}>
                {addressData.bairro} • {addressData.cidade}, {addressData.estado}
              </p>
              {showCoordinates && (
                <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#4b5563' }}>
                  📍 {addressData.latitude.toFixed(6)}, {addressData.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CepSearchFieldsDisplayProps {
  address: AddressData | null;
  showCoordinates?: boolean;
}

export function CepSearchFieldsDisplay({
  address,
  showCoordinates = false,
}: CepSearchFieldsDisplayProps) {
  if (!address) return null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        padding: '12px',
        backgroundColor: '#eff6ff',
        borderRadius: '4px',
        border: '1px solid #bfdbfe',
      }}
    >
      <div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>
          Logradouro
        </p>
        <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
          {address.logradouro}
        </p>
      </div>
      <div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>
          Bairro
        </p>
        <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
          {address.bairro}
        </p>
      </div>
      <div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>
          Cidade
        </p>
        <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
          {address.cidade}
        </p>
      </div>
      <div>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>
          Estado
        </p>
        <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
          {address.estado}
        </p>
      </div>
      {showCoordinates && (
        <>
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>
              Latitude
            </p>
            <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
              {address.latitude.toFixed(6)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>
              Longitude
            </p>
            <p style={{ fontWeight: '500', color: '#1f2937', margin: 0 }}>
              {address.longitude.toFixed(6)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
