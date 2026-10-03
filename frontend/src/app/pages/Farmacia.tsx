import { useState } from 'react';
import ProductInventory from '../components/ProductInventory';
import PendingDispensations from '../components/PendingDispensations';

export default function Farmacia() {
  const [reloadKey, setReloadKey] = useState(0);
  return <ProductInventory tipo="farmacia" reloadKey={reloadKey}>
    <PendingDispensations onDispensed={() => setReloadKey(k => k + 1)} />
  </ProductInventory>;
}
