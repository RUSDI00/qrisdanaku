
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import LoadingSpinner from './components/LoadingSpinner';
import QrCodeDisplay from './components/QrCodeDisplay';
import type { QrisApiResponse, QrisApiResponseSuccess } from './types';

// Icons (simple SVGs)
const AmountIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v15M2.25 12h15M2.25 18h15M15 11.25a.75.75 0 0 0 .75-.75V9.75M16.5 9.75a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V15m1.5-1.5h.75a.75.75 0 0 0 .75-.75V12a.75.75 0 0 0-.75-.75H15m3-3H9.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h3.75m0-1.5v1.5m0-1.5a1.5 1.5 0 0 0-1.5-1.5H5.625c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125h9.75" />
  </svg>
);

const FeeIcon: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);


const PREDEFINED_QRIS_STATIS = "00020101021126570011ID.DANA.WWW011893600915351330224002095133022400303UMI51440014ID.CO.QRIS.WWW0215ID10232925085540303UMI5204481453033605802ID5910FANDI SHOP6015Kab. Labuhanbat6105214116304048C";
const API_ENDPOINT = "https://cekid-ariepulsa.my.id/api/";

type FeeType = 'none' | 'percentage' | 'fixed';

const App: React.FC = () => {
  const [amount, setAmount] = useState<string>('');
  const [feeType, setFeeType] = useState<FeeType>('none');
  const [feeValue, setFeeValue] = useState<string>('');
  
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedQrisString, setGeneratedQrisString] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<{originalAmount: number, fee: number, total: number} | null>(null);

  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    setCardVisible(true);
  }, []);

  const resetFormState = () => {
    setAmount('');
    setFeeType('none');
    setFeeValue('');
  };

  const { calculatedFee, totalAmountForAPI, displayOriginalAmount } = useMemo(() => {
    const originalAmount = parseFloat(amount);
    if (isNaN(originalAmount) || originalAmount <= 0) {
      return { calculatedFee: 0, totalAmountForAPI: 0, displayOriginalAmount: 0 };
    }

    let fee = 0;
    const feeVal = parseFloat(feeValue);

    if (feeType === 'percentage' && !isNaN(feeVal) && feeVal > 0) {
      fee = originalAmount * (feeVal / 100);
    } else if (feeType === 'fixed' && !isNaN(feeVal) && feeVal > 0) {
      fee = feeVal;
    }
    
    fee = Math.max(0, fee);
    
    const total = originalAmount + fee;
    return { 
        calculatedFee: Math.round(fee * 100) / 100, 
        totalAmountForAPI: Math.round(total), 
        displayOriginalAmount: originalAmount
    };
  }, [amount, feeType, feeValue]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setGeneratedImageUrl(null);
    setGeneratedQrisString(null);
    setTransactionDetails(null);

    if (displayOriginalAmount <= 0) {
      setErrorMessage("Jumlah transaksi harus diisi dan lebih besar dari 0.");
      return;
    }
    if (displayOriginalAmount > 999999999999) { 
        setErrorMessage("Jumlah transaksi terlalu besar (maksimum 12 digit).");
        return;
    }

    if ((feeType === 'percentage' || feeType === 'fixed')) {
        const feeValNum = parseFloat(feeValue);
        if (isNaN(feeValNum) || feeValNum <= 0) {
            setErrorMessage(`Nilai fee untuk tipe "${feeType === 'percentage' ? 'Persentase' : 'Nominal Tetap'}" harus diisi angka positif.`);
            return;
        }
        if (feeType === 'percentage' && feeValNum > 100) {
            setErrorMessage("Fee persentase tidak boleh lebih dari 100%.");
            return;
        }
    }

    setIsLoading(true);
    setTransactionDetails({originalAmount: displayOriginalAmount, fee: calculatedFee, total: totalAmountForAPI});

    try {
      const params = new URLSearchParams({
        qris_data: PREDEFINED_QRIS_STATIS,
        nominal: totalAmountForAPI.toString(),
      });
      const fullApiUrl = `${API_ENDPOINT}?${params.toString()}`;

      const response = await fetch(fullApiUrl, { method: 'GET' });

      if (!response.ok) {
        let apiErrorMsg = "Gagal menghubungi API.";
        try {
          const errorData: QrisApiResponse = await response.json();
          apiErrorMsg = (errorData && 'message' in errorData && errorData.message) ? errorData.message : `Error: ${response.status} ${response.statusText}`;
        } catch (jsonError) {
          apiErrorMsg = `Error: ${response.status} ${response.statusText}`;
        }
        throw new Error(apiErrorMsg);
      }

      const responseData: QrisApiResponse = await response.json();

      if (responseData.status === 'success' && 'link_qris' in responseData && 'converted_qris' in responseData) {
        const successData = responseData as QrisApiResponseSuccess;
        setGeneratedImageUrl(successData.link_qris); 
        setGeneratedQrisString(successData.converted_qris); 
        setSuccessMessage(`QRIS berhasil dihasilkan untuk total pembayaran Rp${totalAmountForAPI.toLocaleString('id-ID')}.`);
      } else {
        setErrorMessage( (responseData as any).message || "Respon API tidak valid atau gagal.");
      }
    } catch (error) {
      console.error("API call failed:", error);
      setErrorMessage(error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal saat menghubungi API.");
    } finally {
      setIsLoading(false);
    }
  }, [displayOriginalAmount, feeType, feeValue, calculatedFee, totalAmountForAPI]);
  
  const formatCurrency = (value: number) => {
    return `Rp${value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white transition-opacity duration-500 ease-in-out" style={{ opacity: cardVisible ? 1 : 0 }}>
      <div className={`bg-white p-6 sm:p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-500 ease-in-out ${cardVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-indigo-700">Qris Rusdi</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah Transaksi
            </label>
            <div className="relative rounded-md shadow-sm">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">Rp</span>
              <div className="pointer-events-none absolute inset-y-0 left-9 flex items-center">
                <AmountIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="number"
                id="amount"
                name="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="block w-full rounded-md border-slate-600 bg-slate-700 py-2.5 pl-16 pr-3 text-slate-50 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition duration-150"
                min="1"
                aria-label="Jumlah Transaksi"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Layanan</label>
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1" role="group" aria-label="Tipe Fee Layanan">
              {(['none', 'percentage', 'fixed'] as FeeType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeeType(type)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-150
                    ${feeType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                  aria-pressed={feeType === type}
                >
                  {type === 'none' ? 'Tanpa Fee' : type === 'percentage' ? 'Persen' : 'Tetap (Rp)'}
                </button>
              ))}
            </div>
          </div>

          {(feeType === 'percentage' || feeType === 'fixed') && (
            <div className="animate-fade-in">
              <label htmlFor="feeValue" className="block text-sm font-medium text-gray-700 mb-1">
                Nilai Fee {feeType === 'fixed' ? '(Rp)' : ''}
              </label>
              <div className="relative rounded-md shadow-sm">
                {feeType === 'fixed' && (
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">Rp</span>
                )}
                <div className={`pointer-events-none absolute inset-y-0 ${feeType === 'fixed' ? 'left-9' : 'left-3'} flex items-center`}>
                    <FeeIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="number"
                  id="feeValue"
                  name="feeValue"
                  value={feeValue}
                  onChange={(e) => setFeeValue(e.target.value)}
                  placeholder={feeType === 'percentage' ? 'e.g. 2.5' : 'e.g. 2500'}
                  className={`block w-full rounded-md border-slate-600 bg-slate-700 py-2.5 ${feeType === 'fixed' ? 'pl-16' : 'pl-10'} pr-3 text-slate-50 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition duration-150`}
                  min="0"
                  aria-label={`Nilai Fee ${feeType === 'percentage' ? 'Persentase' : 'Nominal Tetap'}`}
                />
              </div>
            </div>
          )}

          {(parseFloat(amount) > 0) && (
            <div className="mt-4 p-4 border border-indigo-200 bg-indigo-50 rounded-lg space-y-2 text-sm animate-fade-in" aria-live="polite">
              <div className="flex justify-between">
                <span className="text-gray-600">Jumlah Asli:</span>
                <span className="font-medium text-gray-800">{formatCurrency(displayOriginalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fee Layanan:</span>
                <span className="font-medium text-gray-800">{formatCurrency(calculatedFee)}</span>
              </div>
              <hr className="border-indigo-200"/>
              <div className="flex justify-between text-base">
                <span className="font-semibold text-indigo-700">Total Pembayaran:</span>
                <span className="font-bold text-indigo-700">{formatCurrency(totalAmountForAPI)}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !(parseFloat(amount) > 0)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center group"
            aria-disabled={isLoading || !(parseFloat(amount) > 0)}
            aria-live="polite" 
            aria-atomic="true"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Memproses...</span>
              </>
            ) : (
              <>
                <span className="group-hover:scale-105 transition-transform duration-150">Hasilkan QRIS</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-150" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-sm animate-fade-in" role="alert">
            <p className="font-bold">Oops! Terjadi Kesalahan</p>
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {successMessage && !generatedImageUrl && ( 
           <div className="mt-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md shadow-sm animate-fade-in" role="status">
            <p className="font-medium">{successMessage}</p>
          </div>
        )}
      </div>

      {generatedImageUrl && transactionDetails && (
        <div className="w-full max-w-lg mt-8 animate-fade-in-up">
            <QrCodeDisplay 
                imageUrl={generatedImageUrl} 
                generatedQrisString={generatedQrisString} 
                originalAmount={transactionDetails.originalAmount}
                feeAmount={transactionDetails.fee}
                totalAmount={transactionDetails.total}
                altText={`QRIS Code untuk pembayaran ${formatCurrency(transactionDetails.total)}`}
            /> 
        </div>
      )}
      
       <style>
        {`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}
      </style>
    </div>
  );
};

export default App;
