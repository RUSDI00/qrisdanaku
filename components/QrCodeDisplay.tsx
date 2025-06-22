

import React from 'react';

interface QrCodeDisplayProps {
  imageUrl: string; 
  altText?: string;
  generatedQrisString?: string | null; // Keep prop for data flow, but won't display
  originalAmount?: number;
  feeAmount?: number;
  totalAmount?: number;
}

const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({ 
  imageUrl, 
  altText = "QRIS Dinamis", 
  generatedQrisString, // This prop will be ignored for display
  originalAmount,
  feeAmount,
  totalAmount 
}) => {
  if (!imageUrl) {
    return null;
  }

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'N/A';
    return `Rp${value.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6 border border-gray-200 rounded-xl shadow-xl bg-white w-full max-w-lg transition-all duration-300 hover:shadow-2xl">
      <h3 className="text-2xl font-semibold text-indigo-700 mb-6 text-center">QRIS Siap Digunakan!</h3>
      <img
        src={imageUrl} 
        alt={altText}
        className="mx-auto block w-60 h-60 sm:w-64 sm:h-64 object-contain rounded-lg shadow-md border border-gray-100"
      />
      <p className="text-xs text-gray-500 mt-4 text-center">Pindai kode QR ini menggunakan aplikasi pembayaran Anda.</p>
      
      {(originalAmount !== undefined && feeAmount !== undefined && totalAmount !== undefined) && (
        <div className="mt-6 p-4 border border-indigo-100 bg-indigo-50 rounded-lg space-y-2 text-sm">
            <h4 className="text-sm font-semibold text-indigo-600 mb-2">Detail Transaksi:</h4>
            <div className="flex justify-between">
                <span className="text-gray-700">Jumlah Asli:</span>
                <span className="font-medium text-gray-800">{formatCurrency(originalAmount)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-gray-700">Fee Layanan:</span>
                <span className="font-medium text-gray-800">{formatCurrency(feeAmount)}</span>
            </div>
            <hr className="border-indigo-200 my-1"/>
            <div className="flex justify-between text-base">
                <span className="font-semibold text-indigo-700">Total Dibayar:</span>
                <span className="font-bold text-indigo-700">{formatCurrency(totalAmount)}</span>
            </div>
        </div>
      )}

      {/* The following block for generatedQrisString is intentionally removed as per user request */}
      {/* 
      {generatedQrisString && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-700 font-semibold mb-1">Data String QRIS (dari API):</p>
          <p className="text-xs text-gray-600 break-all">{generatedQrisString}</p>
        </div>
      )} 
      */}
    </div>
  );
};

export default QrCodeDisplay;