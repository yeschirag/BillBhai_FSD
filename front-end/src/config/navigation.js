export const NAV_ITEMS = [
  {
    pageKey: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['superuser', 'admin'],
  },
  {
    pageKey: 'orders',
    label: 'Orders & Billing',
    path: '/orders',
    roles: ['superuser', 'admin', 'cashier', 'customer'],
  },
  {
    pageKey: 'inventory',
    label: 'Inventory',
    path: '/inventory',
    roles: ['superuser', 'admin', 'inventorymanager'],
  },
  {
    pageKey: 'delivery',
    label: 'Delivery',
    path: '/delivery',
    roles: ['superuser', 'admin', 'deliveryops'],
  },
  {
    pageKey: 'returns',
    label: 'Returns',
    path: '/returns',
    roles: ['superuser', 'admin', 'returnhandler'],
  },
  {
    pageKey: 'reports',
    label: 'Reports',
    path: '/reports',
    roles: ['superuser', 'admin'],
  },
  {
    pageKey: 'users',
    label: 'Users',
    path: '/users',
    roles: ['superuser', 'admin'],
  },
  {
    pageKey: 'businesses',
    label: 'Businesses',
    path: '/businesses',
    roles: ['superuser'],
  },
  {
    pageKey: 'notifications',
    label: 'Notifications',
    path: '/notifications',
    roles: ['superuser', 'admin', 'cashier', 'inventorymanager', 'deliveryops', 'returnhandler', 'customer'],
  },
  {
    pageKey: 'profile',
    label: 'Profile',
    path: '/profile',
    roles: ['superuser', 'admin', 'cashier', 'inventorymanager', 'deliveryops', 'returnhandler', 'customer'],
  },
  {
    pageKey: 'superuser',
    label: 'Super User Portal',
    path: '/superuser',
    roles: ['superuser'],
  },
]
