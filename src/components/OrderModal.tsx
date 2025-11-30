// OrderModal.tsx
import React from 'react';
import { FaTimes } from 'react-icons/fa';
import OrderForm from './OrderForm';
import type { OrderFormData} from './OrderForm';
import {OrderDetails} from './oder';
import type {Order} from './oder';
import './order.css';

interface Props {
  order: Order;
  onClose: () => void;
  onUpdateStatus: () => void;
  loading?: boolean;
}

interface OrderModalProps {
    onClose: () => void;
    onSubmit: (data: OrderFormData) => Promise<void>;
    loading: boolean;
}

export const OrderDetailsModal: React.FC<Props> = ({ order, onClose, onUpdateStatus, loading }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <OrderDetails 
          order={order} 
          onClose={onClose} 
          onUpdateStatus={onUpdateStatus} 
          loading={loading} 
        />
      </div>
    </div>
  );
};

const OrderModal: React.FC<OrderModalProps> = ({ onClose, onSubmit, loading }) => {
    return (
        // Lớp phủ (Modal Overlay) - Cần style trong order.css
        <div className="modal-overlay">
            {/* Nội dung Modal - Cần style trong order.css */}
            <div className="modal-content">
                <div className="modal-header">
                    <h5 className="modal-title">Tạo đơn hàng mới</h5>
                    <button type="button" className="close-btn" onClick={onClose} disabled={loading}>
                        <FaTimes />
                    </button>
                </div>
                {/* Sử dụng OrderForm bạn đã cung cấp */}
                <OrderForm
                    onSubmit={onSubmit}
                    onCancel={onClose}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default OrderModal;

