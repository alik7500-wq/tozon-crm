import {Link} from 'react-router-dom';
import React, { useState } from 'react';
import { Smartphone, Send } from 'lucide-react';
import { SmsHistoryTable } from '../../components/sms/SmsHistoryTable';
import { SendSmsModal } from '../../components/sms/SendSmsModal';

export const SmsNotificationsPage = () => {
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Smartphone className="h-7 w-7 text-purple-600" />
            <span>SMS-оповещения</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            История SMS и уведомления, ожидающие подтверждения
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSendModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-md cursor-pointer"
        >
          <Send className="h-4 w-4" />
          <span>Отправить SMS</span>
        </button>
      </div>

      <Link to="/crm/buyer-invitations" className="block rounded-2xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100 transition"><span className="block font-bold text-blue-900">Пригласить покупателей в Telegram →</span><span className="mt-1 block text-sm text-blue-800">Клиенты без подключённого бота, персональные SMS и статусы подключения.</span></Link>
      {/* Production Outbox Queue & History Table with Tab Switcher */}
      <SmsHistoryTable
        onOpenSendModal={() => setIsSendModalOpen(true)}
        refreshTrigger={refreshTrigger}
      />

      {/* Production Manual Send SMS Modal */}
      {isSendModalOpen && (
        <SendSmsModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          client={{ id: null, name: '', phone: '' }}
          context="client"
          onSuccess={() => {
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
};
