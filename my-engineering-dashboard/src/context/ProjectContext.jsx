import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [engineerInCharge, setEngineerInCharge] = useState('');
  
  // Tax and overhead defaults
  const [contractorMargin, setContractorMargin] = useState(12); // 12%
  const [gstRate, setGstRate] = useState(18); // 18%
  const [contingencyRate, setContingencyRate] = useState(3); // 3%
  const [laborCessRate, setLaborCessRate] = useState(1); // 1%

  // Project line items: three sample entries to show how the BOQ reads; calculators and the BOQ page add more
  const sample = (id, category, module, description, quantity, unit, rate) => ({
    id, category, module, description, quantity, unit, rate, cost: Math.round(quantity * rate * 100) / 100, date: new Date().toLocaleDateString(),
  });
  const [lineItems, setLineItems] = useState(() => [
    sample('sample-1', 'Earthwork & Substructure', 'Excavation Calculator', 'Earthwork excavation in foundation trenches including soil disposal', 345.5, 'm³', 285),
    sample('sample-2', 'Concrete & RCC', 'Foundation Calculator', 'M25 grade RCC isolated footing concrete', 68.2, 'm³', 6850),
    sample('sample-3', 'Reinforcement Steel', 'Steel Calculator', 'Fe 500D TMT reinforcement bars cut, bent and bound in position', 4850, 'kg', 72),
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
