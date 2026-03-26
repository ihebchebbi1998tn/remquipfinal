import React from 'react';

interface ApplicationPdfTemplateProps {
  data: any;
  signatureData?: string | null;
}

const ApplicationPdfTemplate: React.FC<ApplicationPdfTemplateProps> = ({ data, signatureData }) => {
  const getDistributorLabel = (val: string) => {
    const options: Record<string, string> = {
      reseller: "Revendeur / Reseller",
      logistics: "Logistique / Logistics Co.",
      garage: "Garage / Repair Shop",
      other: "Autre / Other"
    };
    return options[val] || val;
  };

  const currentYear = new Date().getFullYear();

  return (
    <div 
      id="application-pdf-template" 
      className="bg-white p-8 font-sans text-[#090a0f] leading-tight"
      style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', border: '1px solid #eee' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-[#1e40af] pb-6 mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-[#1e40af]">REMQUIP</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            Pièces de remorques & camions / Trailer & Truck Parts
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black uppercase text-[#1e40af]">Ouverture de compte</h2>
          <h3 className="text-sm font-bold uppercase text-muted-foreground">Customer Account Application</h3>
        </div>
      </div>

      {/* Section 1: Company Info */}
      <section className="mb-6">
        <div className="bg-[#1e40af] text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
          1. Informations de l'entreprise / Company Information
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 px-2">
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Raison sociale / Company Name</span>
            <span className="text-sm font-bold">{data.company_name || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">No d'entreprise / NEQ / TVA</span>
            <span className="text-sm font-bold">{data.neq_tva || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Personne contact / Contact Person</span>
            <span className="text-sm font-bold">{data.contact_person || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Titre / Fonction / Title</span>
            <span className="text-sm font-bold">{data.contact_title || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Téléphone / Phone</span>
            <span className="text-sm font-bold">{data.phone || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Courriel / Email</span>
            <span className="text-sm font-bold">{data.email || '—'}</span>
          </div>
        </div>

        <div className="mt-4 px-2">
          <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Type de distributeur / Distributor Type</span>
          <div className="flex flex-wrap gap-4 text-xs">
            {['reseller', 'logistics', 'garage', 'other'].map(opt => (
              <div key={opt} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 border border-gray-400 flex items-center justify-center ${data.distributor_type?.includes(opt) ? 'bg-[#1e40af] border-[#1e40af]' : ''}`}>
                  {data.distributor_type?.includes(opt) && <div className="text-[10px] text-white">✓</div>}
                </div>
                <span className={data.distributor_type?.includes(opt) ? 'font-bold' : 'text-gray-600'}>
                  {getDistributorLabel(opt)}
                </span>
              </div>
            ))}
          </div>
          {data.distributor_type?.includes('other') && data.distributor_type_other && (
            <p className="text-[10px] italic mt-1 text-gray-600">Note: {data.distributor_type_other}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-8 mt-4 px-2">
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Nombre de camions / Number of Trucks</span>
            <span className="text-sm font-bold">{data.num_trucks || '0'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Nombre de remorques / Number of Trailers</span>
            <span className="text-sm font-bold">{data.num_trailers || '0'}</span>
          </div>
        </div>
      </section>

      {/* Section 2: Addresses */}
      <section className="mb-6">
        <div className="bg-[#1e40af] text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
          2. Adresses / Addresses
        </div>
        <div className="grid grid-cols-2 gap-8 px-2">
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Adresse de facturation / Billing Address</span>
            <div className="text-sm font-bold min-h-[60px] whitespace-pre-wrap">{data.billing_address || '—'}</div>
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Adresse de livraison / Shipping Address</span>
            <div className="text-sm font-bold min-h-[60px] whitespace-pre-wrap">{data.shipping_address || '—'}</div>
          </div>
        </div>
      </section>

      {/* Section 3: Accounting */}
      <section className="mb-6">
        <div className="bg-[#1e40af] text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
          3. Comptabilité et paiement / Accounting & Payment
        </div>
        <div className="grid grid-cols-3 gap-6 px-2 mb-4">
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Contact comptabilité / Contact</span>
            <span className="text-sm font-bold">{data.accounting_contact || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Téléphone / Phone</span>
            <span className="text-sm font-bold">{data.accounting_phone || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Courriel / Billing Email</span>
            <span className="text-sm font-bold">{data.billing_email || '—'}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 px-2">
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase block mb-2">Conditions / Payment Terms</span>
            <div className="space-y-1 text-[11px]">
               {['on_delivery', 'net_15', 'net_30', 'on_order'].map(t => (
                 <div key={t} className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full border border-gray-400 ${data.payment_terms === t ? 'bg-[#1e40af] border-[#1e40af]' : ''}`} />
                   <span className={data.payment_terms === t ? 'font-bold' : 'text-gray-600'}>{t.replace('_', ' ').toUpperCase()}</span>
                 </div>
               ))}
            </div>
          </div>
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase block mb-2">Mode de paiement / Payment Method</span>
            <div className="space-y-1 text-[11px]">
               {['transfer', 'cheque', 'credit_card', 'other'].map(m => (
                 <div key={m} className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full border border-gray-400 ${data.payment_method === m ? 'bg-[#1e40af] border-[#1e40af]' : ''}`} />
                   <span className={data.payment_method === m ? 'font-bold' : 'text-gray-600'}>{m.replace('_', ' ').toUpperCase()}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Credit References */}
      <section className="mb-6">
        <div className="bg-[#1e40af] text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
          4. Références de crédit / Credit References
        </div>
        <div className="grid grid-cols-2 gap-8 px-2 mb-4">
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Référence bancaire / Bank Reference</span>
            <span className="text-sm font-bold">{data.bank_reference || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Limite demandée / Credit Limit</span>
            <span className="text-sm font-bold">{data.credit_limit_requested ? `$${data.credit_limit_requested}` : '—'}</span>
          </div>
        </div>
        <div className="space-y-3 px-2">
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Référence fournisseur 1 / Supplier Reference 1</span>
            <span className="text-sm font-bold whitespace-pre-wrap">{data.supplier_ref_1 || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Référence fournisseur 2 / Supplier Reference 2</span>
            <span className="text-sm font-bold whitespace-pre-wrap">{data.supplier_ref_2 || '—'}</span>
          </div>
        </div>
      </section>

      {/* Section 5: Signature */}
      <section>
        <div className="bg-[#1e40af] text-white px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-4">
          5. Validation / Authorization
        </div>
        <div className="grid grid-cols-2 gap-8 px-2 mb-6">
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Nom du signataire / Signatory Name</span>
            <span className="text-sm font-bold">{data.signatory_name || '—'}</span>
          </div>
          <div className="border-b border-gray-200 pb-1">
            <span className="text-[9px] font-bold text-gray-500 uppercase block">Titre / Fonction / Title</span>
            <span className="text-sm font-bold">{data.signatory_title || '—'}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-8 px-2 items-end">
           <div className="border-b border-gray-200 pb-1 col-span-1">
             <span className="text-[9px] font-bold text-gray-500 uppercase block">Date</span>
             <span className="text-sm font-bold">{data.signature_date || '—'}</span>
           </div>
           
           <div className="col-span-2 border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center min-h-[120px] justify-center relative">
             <span className="text-[8px] font-bold text-gray-400 absolute top-1 left-2 uppercase tracking-tight">Signature</span>
             {data.signature_url ? (
               <img src={data.signature_url} alt="Signature Uploaded" className="max-h-[100px] object-contain" />
             ) : signatureData ? (
               <img src={signatureData} alt="Signature Drawn" className="max-h-[100px] object-contain" />
             ) : (
               <span className="text-xs text-gray-300 italic">No signature provided</span>
             )}
           </div>
        </div>
      </section>

      <footer className="mt-12 text-center text-[10px] font-bold text-gray-400 border-t pt-4">
        Merci de nous retourner ce formulaire complété / Please complete this application form
        <br />
        © {currentYear} REMQUIP — 123 Industrial Blvd, Quebec, Canada | www.remquip.com
      </footer>
    </div>
  );
};

export default ApplicationPdfTemplate;
