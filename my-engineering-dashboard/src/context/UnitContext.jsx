import React, { createContext, useContext, useState } from 'react';

const UnitContext = createContext();

export const UnitProvider = ({ children }) => {
  const [unitSystem, setUnitSystem] = useState('metric'); // 'metric' | 'imperial'
  const [currency, setCurrency] = useState('₹');

  // Conversion Factors
  // Length: m <-> ft
  // Area: m² <-> sq.ft
  // Volume: m³ <-> cu.ft
  // Weight: kg <-> lbs

  const toggleUnitSystem = () => {
    setUnitSystem(prev => (prev === 'metric' ? 'imperial' : 'metric'));
  };

  const getLabels = () => {
    if (unitSystem === 'metric') {
      return {
        length: 'm',
        smallLength: 'mm',
        area: 'm²',
        volume: 'm³',
        weight: 'kg',
        heavyWeight: 'MT (Tonnes)',
        rateVol: `${currency}/m³`,
        rateArea: `${currency}/m²`,
        rateWeight: `${currency}/kg`
      };
    } else {
      return {
        length: 'ft',
        smallLength: 'in',
        area: 'sq.ft',
        volume: 'cu.ft',
        weight: 'lbs',
        heavyWeight: 'US Tons',
        rateVol: `${currency}/cu.ft`,
        rateArea: `${currency}/sq.ft`,
        rateWeight: `${currency}/lb`
      };
    }
  };

  return (
    <UnitContext.Provider
      value={{
        unitSystem,
        setUnitSystem,
        toggleUnitSystem,
        currency,
        setCurrency,
        labels: getLabels(),
        isMetric: unitSystem === 'metric'
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export const useUnit = () => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
};
