// sampleProcess.ts - Sample customer refund flow for MVP
import { ProcessMap, Role, ProcessStep, Connection, ROLE_COLORS } from '../types/process';

// Sample roles for customer refund process
const roles: Role[] = [
  {
    id: 'role_customer',
    name: 'Customer',
    type: 'human',
    color: ROLE_COLORS.human,
  },
  {
    id: 'role_support',
    name: 'Support Team',
    type: 'human',
    color: ROLE_COLORS.human,
  },
  {
    id: 'role_system',
    name: 'CRM System',
    type: 'system',
    color: ROLE_COLORS.system,
  },
  {
    id: 'role_finance',
    name: 'Finance',
    type: 'human',
    color: ROLE_COLORS.human,
  },
];

// Sample steps for customer refund process
const steps: ProcessStep[] = [
  {
    id: 'step_start',
    roleId: 'role_customer',
    type: 'start',
    name: 'Start',
    description: 'Process begins',
    position: { x: 0, y: 0 }, // Will be auto-positioned
  },
  {
    id: 'step_submit_request',
    roleId: 'role_customer',
    type: 'task',
    name: 'Submit Refund Request',
    description: 'Customer fills out refund form',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_log_ticket',
    roleId: 'role_system',
    type: 'task',
    name: 'Create Ticket',
    description: 'System logs the request',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_review',
    roleId: 'role_support',
    type: 'task',
    name: 'Review Request',
    description: 'Support reviews refund details',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_decision',
    roleId: 'role_support',
    type: 'decision',
    name: 'Approved?',
    description: 'Decision based on policy',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_process_refund',
    roleId: 'role_finance',
    type: 'task',
    name: 'Process Refund',
    description: 'Finance processes payment',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_notify_decline',
    roleId: 'role_system',
    type: 'task',
    name: 'Send Decline Email',
    description: 'System notifies customer',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_wait_processing',
    roleId: 'role_finance',
    type: 'delay',
    name: 'Processing Time',
    description: 'Wait for payment processing',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_confirm',
    roleId: 'role_system',
    type: 'task',
    name: 'Send Confirmation',
    description: 'System confirms refund',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_end_approved',
    roleId: 'role_customer',
    type: 'end',
    name: 'Refund Complete',
    description: 'Customer receives refund',
    position: { x: 0, y: 0 },
  },
  {
    id: 'step_end_declined',
    roleId: 'role_customer',
    type: 'end',
    name: 'Request Closed',
    description: 'Request declined',
    position: { x: 0, y: 0 },
  },
];

// Connections between steps
const connections: Connection[] = [
  {
    id: 'conn_1',
    fromStepId: 'step_start',
    toStepId: 'step_submit_request',
  },
  {
    id: 'conn_2',
    fromStepId: 'step_submit_request',
    toStepId: 'step_log_ticket',
  },
  {
    id: 'conn_3',
    fromStepId: 'step_log_ticket',
    toStepId: 'step_review',
  },
  {
    id: 'conn_4',
    fromStepId: 'step_review',
    toStepId: 'step_decision',
  },
  {
    id: 'conn_5',
    fromStepId: 'step_decision',
    toStepId: 'step_process_refund',
    label: 'Yes',
  },
  {
    id: 'conn_6',
    fromStepId: 'step_decision',
    toStepId: 'step_notify_decline',
    label: 'No',
  },
  {
    id: 'conn_7',
    fromStepId: 'step_process_refund',
    toStepId: 'step_wait_processing',
  },
  {
    id: 'conn_8',
    fromStepId: 'step_wait_processing',
    toStepId: 'step_confirm',
  },
  {
    id: 'conn_9',
    fromStepId: 'step_confirm',
    toStepId: 'step_end_approved',
  },
  {
    id: 'conn_10',
    fromStepId: 'step_notify_decline',
    toStepId: 'step_end_declined',
  },
];

// Complete sample process map
export const sampleRefundProcess: ProcessMap = {
  id: 'process_customer_refund',
  name: 'Customer Refund Process',
  description: 'End-to-end workflow for handling customer refund requests, from submission through approval/rejection to completion.',
  version: '1.0.0',
  roles,
  steps,
  connections,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Alternative simpler sample
export const sampleOrderProcess: ProcessMap = {
  id: 'process_order_fulfillment',
  name: 'Order Fulfillment Process',
  description: 'Simple order processing workflow from order placement to delivery.',
  version: '1.0.0',
  roles: [
    { id: 'role_buyer', name: 'Buyer', type: 'human', color: ROLE_COLORS.human },
    { id: 'role_store', name: 'Online Store', type: 'system', color: ROLE_COLORS.system },
    { id: 'role_warehouse', name: 'Warehouse', type: 'human', color: ROLE_COLORS.human },
  ],
  steps: [
    { id: 's1', roleId: 'role_buyer', type: 'start', name: 'Start', position: { x: 0, y: 0 } },
    { id: 's2', roleId: 'role_buyer', type: 'task', name: 'Place Order', position: { x: 0, y: 0 } },
    { id: 's3', roleId: 'role_store', type: 'task', name: 'Validate Order', position: { x: 0, y: 0 } },
    { id: 's4', roleId: 'role_store', type: 'decision', name: 'In Stock?', position: { x: 0, y: 0 } },
    { id: 's5', roleId: 'role_warehouse', type: 'task', name: 'Pack Order', position: { x: 0, y: 0 } },
    { id: 's6', roleId: 'role_warehouse', type: 'task', name: 'Ship Order', position: { x: 0, y: 0 } },
    { id: 's7', roleId: 'role_store', type: 'task', name: 'Notify Backorder', position: { x: 0, y: 0 } },
    { id: 's8', roleId: 'role_buyer', type: 'end', name: 'Order Delivered', position: { x: 0, y: 0 } },
    { id: 's9', roleId: 'role_buyer', type: 'end', name: 'Order Pending', position: { x: 0, y: 0 } },
  ],
  connections: [
    { id: 'c1', fromStepId: 's1', toStepId: 's2' },
    { id: 'c2', fromStepId: 's2', toStepId: 's3' },
    { id: 'c3', fromStepId: 's3', toStepId: 's4' },
    { id: 'c4', fromStepId: 's4', toStepId: 's5', label: 'Yes' },
    { id: 'c5', fromStepId: 's4', toStepId: 's7', label: 'No' },
    { id: 'c6', fromStepId: 's5', toStepId: 's6' },
    { id: 'c7', fromStepId: 's6', toStepId: 's8' },
    { id: 'c8', fromStepId: 's7', toStepId: 's9' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export default sampleRefundProcess;
