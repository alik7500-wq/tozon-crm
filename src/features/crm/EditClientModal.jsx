import React from 'react';
import { ClientModal } from './ClientModal';

export const EditClientModal = ({
  isOpen,
  onClose,
  client,
  onClientUpdated
}) => {
  return (
    <ClientModal
      isOpen={isOpen}
      mode="edit"
      client={client}
      onClose={onClose}
      onClientSaved={onClientUpdated}
    />
  );
};
