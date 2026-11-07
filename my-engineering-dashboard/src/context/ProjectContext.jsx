import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projectName, setProjectName] = useState('Commercial G+3 RCC Project');
  const [clientName, setClientName] = useState('Apex Infrastructure Ltd.');
  const [siteLocation, setSiteLocation] = useState('Sector 62, Metro Hub, Delhi-NCR');
  const [engineerInCharge, setEngineerInCharge] = useState('Er. Mohammed Ismail (M.Tech Structural)');
  const [projectRef, setProjectRef] = useState('CM-2026-RCC-089');
  
  // Tax and overhead defaults
  const [contractorMargin, setContractorMargin] = useState(12); // 12%
  const [gstRate, setGstRate] = useState(18); // 18%
  const [contingencyRate, setContingencyRate] = useState(3); // 3%
  const [laborCessRate, setLaborCessRate] = useState(1); // 1%

  // Project Line Items (Pre-populated with realistic initial civil engineering schedule)
  const [lineItems, setLineItems] = useState([
    {
      id: 'item-1',
      category: 'Earthwork & Substructure',
      module: 'Excavation Calculator',
      description: 'Earthwork excavation in foundation trenches including 1.5m depth batter and soil disposal',
      quantity: 345.5,
      unit: 'm³',
      rate: 285,
      cost: 98467.5,
      date: new Date().toLocaleDateString()
    },
    {
      id: 'item-2',
      category: 'Concrete & RCC',
      module: 'Foundation Calculator',
      description: 'M25 grade RCC isolated footing concrete with 1:1:2 design mix batching',
      quantity: 68.2,
      unit: 'm³',
      rate: 6850,
      cost: 467170,
      date: new Date().toLocaleDateString()
    },
    {
      id: 'item-3',
      category: 'Reinforcement Steel',
      module: 'Steel Calculator',
      description: 'Fe 500D TMT reinforcement bars cut, bent and bound in position as per IS 1786',
      quantity: 4850,
      unit: 'kg',
      rate: 72,
      cost: 349200,
      date: new Date().toLocaleDateString()
    },
    {
      id: 'item-4',
      category: 'Masonry Work',
      module: 'Bricks Calculator',
      description: '230mm thick modular clay brick masonry in cement mortar 1:6 (1 cement : 6 sand)',
      quantity: 18500,
      unit: 'Nos',
      rate: 11.5,
      cost: 212750,
      date: new Date().toLocaleDateString()
    },
    {
      id: 'item-5',
      category: 'Finishes & Plaster',
      module: 'Plaster Calculator',
      description: '15mm thick internal cement plaster 1:4 with sponge smooth float finish',
      quantity: 420,
      unit: 'm²',
      rate: 195,
      cost: 81900,
      date: new Date().toLocaleDateString()
    }
  ]);

  // Method to add items from any calculator
  const addItemToProject = (item) => {
    const newItem = {
      id: `item-${Date.now()}`,
      category: item.category || 'General Civil',
      module: item.module || 'Calculator Engine',
      description: item.description || `${item.module} Takeoff`,
      quantity: Number(item.quantity) || 1,
      unit: item.unit || 'units',
      rate: Number(item.rate) || 0,
      cost: Number(item.cost) || ((Number(item.quantity) || 1) * (Number(item.rate) || 0)),
      date: new Date().toLocaleDateString()
    };
    setLineItems(prev => [newItem, ...prev]);
    return newItem;
  };

  const removeItemFromProject = (id) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const clearProjectItems = () => {
    setLineItems([]);
  };

  // Cost Computations
  const subtotal = lineItems.reduce((sum, item) => sum + item.cost, 0);
  const contractorAmount = (subtotal * contractorMargin) / 100;
  const contingencyAmount = (subtotal * contingencyRate) / 100;
  const laborCessAmount = (subtotal * laborCessRate) / 100;
  const taxableBase = subtotal + contractorAmount + contingencyAmount + laborCessAmount;
  const gstAmount = (taxableBase * gstRate) / 100;
  const grandTotal = taxableBase + gstAmount;

  return (
    <ProjectContext.Provider
      value={{
        projectName, setProjectName,
        clientName, setClientName,
        siteLocation, setSiteLocation,
        engineerInCharge, setEngineerInCharge,
        projectRef, setProjectRef,
        contractorMargin, setContractorMargin,
        gstRate, setGstRate,
        contingencyRate, setContingencyRate,
        laborCessRate, setLaborCessRate,
        lineItems,
        addItemToProject,
        removeItemFromProject,
        clearProjectItems,
        subtotal,
        contractorAmount,
        contingencyAmount,
        laborCessAmount,
        gstAmount,
        grandTotal
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
