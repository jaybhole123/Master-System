import React from 'react';
import Select from 'react-select';

const SearchableSelect = ({ options, value, onChange, placeholder, className, isClearable = false }) => {
  const selectedOption = options.find(opt => opt.value === value) || (value === '' ? options[0] : null);

  return (
    <Select
      value={selectedOption}
      onChange={(selected) => onChange(selected ? selected.value : '')}
      options={options}
      placeholder={placeholder}
      isClearable={isClearable}
      isSearchable
      unstyled
      menuPortalTarget={document.body}
      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
      className={className}
      classNames={{
        control: (state) => `w-full bg-white border ${state.isFocused ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-300'} rounded-lg lg:rounded px-2 min-h-[32px] md:min-h-[38px] cursor-pointer transition-shadow flex items-center`,
        valueContainer: () => "px-1 flex-1 flex items-center overflow-hidden",
        input: () => "m-0 p-0 text-[11px] md:text-sm text-gray-800",
        singleValue: () => "text-[11px] md:text-sm text-gray-800 truncate",
        placeholder: () => "text-[11px] md:text-sm text-gray-400 truncate",
        menu: () => "mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]",
        menuList: () => "p-1 custom-scrollbar max-h-48 overflow-y-auto",
        option: (state) => `px-3 py-2 text-[11px] md:text-sm rounded-md cursor-pointer transition-colors ${
          state.isSelected ? 'bg-indigo-600 text-white font-medium' : 
          state.isFocused ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
        }`,
        indicatorSeparator: () => "hidden",
        dropdownIndicator: () => "text-gray-400 p-1 hover:text-gray-600"
      }}
    />
  );
};

export default SearchableSelect;
