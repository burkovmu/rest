'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { menuItems as initialMenuItems } from '@/components/Menu';
import { Dialog } from '@headlessui/react';
import { menuService } from '@/services/menuService';
import { PencilIcon, PlusIcon } from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  price: string;
  description: string;
  image: string;
  nutrition: {
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
  };
  weight?: string;
  isSubcategory?: boolean;
  level?: number;
  items?: MenuItem[];
}

interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<{
    item: MenuItem;
    categoryName: string;
    path: string[];
  } | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState<string>('');
  const [newItem, setNewItem] = useState<MenuItem>({
    name: '',
    price: '',
    description: '',
    image: '',
    weight: '',
    nutrition: {
      calories: 0,
      protein: 0,
      fats: 0,
      carbs: 0
    }
  });
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'г' | 'мл'>('г');

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const data = await menuService.loadMenu();
        setMenuItems(data);
      } catch (error) {
        console.error('Ошибка при загрузке меню:', error);
      }
    };

    loadMenu();
  }, []);

  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      try {
        menuService.saveMenu(menuItems).catch(error => {
          console.error('Ошибка при синхронизации с сервером:', error);
        });
      } catch (error) {
        console.error('Ошибка при сохранении меню:', error);
      }
    }
  }, [menuItems]);

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        const updatedMenu = [...menuItems, { category: newCategoryName, items: [] }];
        await menuService.saveMenu(updatedMenu);
        setMenuItems(updatedMenu);
        setIsAddingCategory(false);
        setNewCategoryName('');
      } catch (error) {
        console.error('Ошибка при добавлении категории:', error);
      }
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию и все её содержимое?')) return;
    
    try {
      const updatedMenu = await menuService.deleteCategory(menuItems, categoryName);
      setMenuItems(updatedMenu);
      setSelectedCategory('');
      setSelectedPath([]);
    } catch (error) {
      console.error('Ошибка при удалении категории:', error);
    }
  };

  const handleMoveCategoryUp = async (categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedMenu = await menuService.moveCategoryUp(menuItems, categoryName);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при перемещении категории вверх:', error);
    }
  };

  const handleMoveCategoryDown = async (categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedMenu = await menuService.moveCategoryDown(menuItems, categoryName);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при перемещении категории вниз:', error);
    }
  };

  const handleMoveItemUp = async (categoryName: string, path: string[]) => {
    try {
      const updatedMenu = [...menuItems];
      const category = updatedMenu.find(cat => cat.category === categoryName);
      if (!category) return;

      const moveItemInArray = (items: MenuItem[], index: number) => {
        if (index <= 0) return items;
        const newItems = [...items];
        [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
        return newItems;
      };

      const moveItem = (items: MenuItem[], currentPath: string[]): MenuItem[] => {
        if (currentPath.length === 1) {
          const index = items.findIndex(item => item.name === currentPath[0]);
          return moveItemInArray(items, index);
        }

        const [current, ...rest] = currentPath;
        const parentIndex = items.findIndex(item => item.name === current);
        
        if (parentIndex === -1) return items;
        
        const parent = items[parentIndex];
        if (!parent.items) return items;

        return items.map((item, index) => {
          if (index === parentIndex) {
            return {
              ...item,
              items: moveItem(parent.items!, rest)
            };
          }
          return item;
        });
      };

      category.items = moveItem(category.items, path);
      await menuService.saveMenu(updatedMenu);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при перемещении элемента вверх:', error);
    }
  };

  const handleMoveItemDown = async (categoryName: string, path: string[]) => {
    try {
      const updatedMenu = [...menuItems];
      const category = updatedMenu.find(cat => cat.category === categoryName);
      if (!category) return;

      const moveItemInArray = (items: MenuItem[], index: number) => {
        if (index >= items.length - 1) return items;
        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        return newItems;
      };

      const moveItem = (items: MenuItem[], currentPath: string[]): MenuItem[] => {
        if (currentPath.length === 1) {
          const index = items.findIndex(item => item.name === currentPath[0]);
          return moveItemInArray(items, index);
        }

        const [current, ...rest] = currentPath;
        const parentIndex = items.findIndex(item => item.name === current);
        
        if (parentIndex === -1) return items;
        
        const parent = items[parentIndex];
        if (!parent.items) return items;

        return items.map((item, index) => {
          if (index === parentIndex) {
            return {
              ...item,
              items: moveItem(parent.items!, rest)
            };
          }
          return item;
        });
      };

      category.items = moveItem(category.items, path);
      await menuService.saveMenu(updatedMenu);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при перемещении элемента вниз:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedCategory || !newItem.name) {
      alert('Выберите категорию и введите название блюда');
      return;
    }

    try {
      const itemToAdd: MenuItem = {
        name: newItem.name,
        price: newItem.price ? (newItem.price.endsWith('₽') ? newItem.price : `${newItem.price}₽`) : '',
        description: newItem.description || '',
        image: newItem.image || '',
        nutrition: {
          calories: parseInt(newItem.nutrition?.calories?.toString() || '0'),
          protein: parseInt(newItem.nutrition?.protein?.toString() || '0'),
          fats: parseInt(newItem.nutrition?.fats?.toString() || '0'),
          carbs: parseInt(newItem.nutrition?.carbs?.toString() || '0'),
        },
        weight: newItem.weight || ''
      };

      const updatedMenu = await menuService.addItem(
        menuItems,
        selectedCategory,
        itemToAdd,
        selectedPath
      );

      setMenuItems(updatedMenu);
      const currentPath = selectedPath;
      const currentExpandedCategories = expandedCategories;
      resetForm();
      setSelectedPath(currentPath);
      setExpandedCategories(currentExpandedCategories);
      setIsAddingItem(false);
    } catch (error) {
      console.error('Ошибка при добавлении блюда:', error);
      alert('Ошибка при добавлении блюда');
    }
  };

  const handleEditItem = (categoryName: string, item: MenuItem, path: string[]) => {
    setEditingItem({ item, categoryName, path });
    setSelectedCategory(categoryName);
    setSelectedPath(path.length > 0 ? path.slice(0, -1) : []);
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      weight: item.weight || '',
      nutrition: { ...item.nutrition },
      isSubcategory: item.isSubcategory,
      level: item.level,
      items: item.items
    });
    setIsEditingItem(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const updatedItemData = {
        ...editingItem.item,
        ...newItem,
        price: !editingItem.item.isSubcategory ? newItem.price.replace(/₽/g, '').trim() + '₽' : '',
        items: editingItem.item.isSubcategory ? editingItem.item.items : undefined
      };

      const updatedMenu = await menuService.updateItemWithMove(
        menuItems,
        editingItem.categoryName,
        editingItem.path,
        selectedCategory,
        [...selectedPath, editingItem.item.name],
        updatedItemData
      );

      setMenuItems(updatedMenu);
      resetForm();
      setIsEditingItem(false);
      alert('Изменения успешно сохранены!');
    } catch (error) {
      console.error('Ошибка при обновлении элемента:', error);
      alert('Произошла ошибка при обновлении элемента');
    }
  };

  const handleDeleteItem = async (categoryName: string, path: string[]) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;

    try {
      const updatedMenu = await menuService.deleteItem(menuItems, categoryName, path);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при удалении элемента:', error);
      alert('Произошла ошибка при удалении элемента');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setNewItem({
      name: '',
      price: '',
      description: '',
      image: '',
      weight: '',
      nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 }
    });
    setIsSubcategory(false);
    setIsAddingSubcategory(false);
    if (!selectedCategory) {
      const firstCategory = menuItems[0]?.category || '';
      setSelectedCategory(firstCategory);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await menuService.uploadImage(file);
      
      if (isEditing && editingItem) {
        setEditingItem({
          ...editingItem,
          item: { ...editingItem.item, image: imageUrl }
        });
      } else {
        setNewItem({ ...newItem, image: imageUrl });
      }
      setImagePreviewError('');
    } catch (error) {
      console.error('Ошибка при загрузке изображения:', error);
      setImagePreviewError('Ошибка при загрузке изображения');
    }
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory || !newItem.name.trim()) {
      alert('Пожалуйста, введите название подкатегории');
      return;
    }

    const subcategoryToAdd: MenuItem = {
      name: newItem.name.trim(),
      price: '',
      description: '',
      image: '',
      nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 },
      isSubcategory: true,
      level: selectedPath.length + 1,
      items: []
    };

    try {
      const updatedMenu = [...menuItems];
      const category = updatedMenu.find(cat => cat.category === selectedCategory);
      
      if (!category) {
        alert('Категория не найдена');
        return;
      }

      const addSubcategoryToItems = (items: MenuItem[], path: string[]): MenuItem[] => {
        if (path.length === 0) {
          // Проверяем, нет ли уже подкатегории с таким именем
          if (items.some(item => item.name === subcategoryToAdd.name)) {
            throw new Error('Подкатегория с таким названием уже существует');
          }
          return [...items, subcategoryToAdd];
        }

        return items.map(item => {
          if (item.name === path[0] && item.isSubcategory) {
            return {
              ...item,
              items: addSubcategoryToItems(item.items || [], path.slice(1))
            };
          }
          return item;
        });
      };

      category.items = addSubcategoryToItems(category.items, selectedPath);
      await menuService.saveMenu(updatedMenu);
      setMenuItems(updatedMenu);
      setIsAddingSubcategory(false);
      resetForm();
      alert('Подкатегория успешно добавлена!');
    } catch (error) {
      console.error('Ошибка при добавлении подкатегории:', error);
      alert(error instanceof Error ? error.message : 'Произошла ошибка при добавлении подкатегории');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryName || !newCategoryName.trim()) return;

    try {
      const updatedMenu = menuItems.map(category => {
        if (category.category === editingCategoryName) {
          return { ...category, category: newCategoryName.trim() };
        }
        return category;
      });

      await menuService.saveMenu(updatedMenu);
      setMenuItems(updatedMenu);
      setIsEditingCategory(false);
      setEditingCategoryName('');
      setNewCategoryName('');
    } catch (error) {
      console.error('Ошибка при обновлении названия категории:', error);
      alert('Произошла ошибка при обновлении названия категории');
    }
  };

  const getCurrentItems = () => {
    const category = menuItems.find(cat => cat.category === selectedCategory);
    if (!category) return [];

    let currentItems = category.items;
    let path = selectedPath;

    // Если путь не пустой, ищем нужную подкатегорию
    for (const pathItem of path) {
      const subcategory = currentItems.find(item => item.name === pathItem && item.isSubcategory);
      if (subcategory && subcategory.items) {
        currentItems = subcategory.items;
      } else {
        return [];
      }
    }

    return currentItems;
  };

  const handleItemClick = (item: MenuItem, path: string[], categoryName: string) => {
    if (item.isSubcategory) {
      setSelectedCategory(categoryName);
      setSelectedPath(path);
      // Разворачиваем все родительские категории
      const parentPaths: string[] = [];
      let currentPath = '';
      path.forEach(segment => {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        parentPaths.push(currentPath);
      });
      setExpandedCategories([...new Set([...expandedCategories, categoryName, ...parentPaths])]);
    }
  };

  const renderMenuItem = (item: MenuItem, path: string[], level: number = 0) => {
    const isSelected = selectedPath.join('/') === path.join('/');
    const isParentOfSelected = selectedPath.length > path.length && 
      path.every((item, index) => selectedPath[index] === item);

    return (
      <div
        key={item.name}
        className={`group relative flex items-center space-x-2 px-4 py-2 cursor-pointer rounded-lg transition-all ${
          isSelected
            ? 'bg-[#E6B980]/20 hover:bg-[#E6B980]/30'
            : isParentOfSelected
            ? 'bg-white/5 hover:bg-white/10'
            : 'hover:bg-white/5'
        }`}
        style={{ marginLeft: `${level * 1}rem` }}
        onClick={(e) => {
          e.stopPropagation();
          handleItemClick(item, path, selectedCategory);
        }}
      >
        <div className="flex-1 flex items-center min-w-0">
          {item.isSubcategory && item.items && item.items.length > 0 ? (
            <svg className="w-4 h-4 text-[#E6B980] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : null}
          <span className={`ml-2 truncate ${isSelected ? 'text-[#E6B980]' : 'text-white/90'}`}>
            {item.name}
          </span>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMoveItemUp(selectedCategory, path);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Переместить вверх"
          >
            <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMoveItemDown(selectedCategory, path);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Переместить вниз"
          >
            <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditItem(selectedCategory, item, path);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Редактировать"
          >
            <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteItem(selectedCategory, path);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Удалить"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderCategoryTree = (category: MenuCategory) => {
    return (
      <div key={category.category} className="space-y-2">
        <div className="group flex items-center justify-between space-x-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
          <span className="text-white/90 font-medium">{category.category}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveItemUp(category.category, category.items.map(item => item.name));
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Переместить вверх"
            >
              <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveItemDown(category.category, category.items.map(item => item.name));
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Переместить вниз"
            >
              <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                setSelectedCategory(category.category);
                setSelectedPath([]);
                setIsEditingCategory(true);
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Редактировать"
            >
              <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => handleDeleteCategory(category.category)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Удалить"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {renderCategoryItems(category.items)}
      </div>
    );
  };

  const getAllSubcategories = (items: MenuItem[], currentPath: string[] = []): { path: string[], name: string }[] => {
    let result: { path: string[], name: string }[] = [];
    
    items.forEach(item => {
      if (item.isSubcategory) {
        result.push({ path: currentPath, name: item.name });
        if (item.items) {
          result = [...result, ...getAllSubcategories(item.items, [...currentPath, item.name])];
        }
      }
    });
    
    return result;
  };

  const renderSubcategorySelect = () => {
    const category = menuItems.find(cat => cat.category === selectedCategory);
    if (!category || !category.items) return null;

    const subcategories = category.items.reduce((acc: { path: string[], name: string }[], item) => {
      if (item.isSubcategory) {
        acc.push({ path: [], name: item.name });
        if (item.items) {
          acc.push(...getAllSubcategories(item.items, [item.name]));
        }
      }
      return acc;
    }, []);

    if (subcategories.length === 0) return null;

    return (
      <div className="mb-4">
        <label className="block text-[10px] md:text-xs text-[#E6B980] tracking-[0.15em] uppercase mb-2">
          Подкатегория (необязательно)
        </label>
        <select
          value={selectedPath.join('/')}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              setSelectedPath(value.split('/'));
            } else {
              setSelectedPath([]);
            }
          }}
          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
        >
          <option value="" className="bg-[#0A0A0A]">Без подкатегории</option>
          {subcategories.map((subcat) => (
            <option 
              key={[...subcat.path, subcat.name].join('/')} 
              value={[...subcat.path, subcat.name].join('/')}
              className="bg-[#0A0A0A]"
            >
              {'↳'.repeat(subcat.path.length + 1)} {subcat.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderCategoryItems = (items: MenuItem[], path: string[] = [], level: number = 0) => {
    return items.map((item, index) => {
      if (item.isSubcategory) {
        const isExpanded = expandedCategories.includes([...path, item.name].join('/'));
        const hasSubcategories = item.items && item.items.length > 0;
        return (
          <div key={index} className="pl-4">
            <div className="flex items-center justify-between group">
              <button
                onClick={() => {
                  const itemPath = [...path, item.name].join('/');
                  if (isExpanded) {
                    setExpandedCategories(expandedCategories.filter(p => p !== itemPath));
                  } else {
                    setExpandedCategories([...expandedCategories, itemPath]);
                  }
                  setSelectedCategory(editingCategoryName);
                  setSelectedPath([...path, item.name]);
                }}
                className={`text-left flex-1 py-2 px-4 rounded-lg transition-colors ${
                  selectedPath.join('/') === [...path, item.name].join('/')
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {hasSubcategories && (
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  <span>{item.name}</span>
                </div>
              </button>
              <div className="flex items-center">
                <button
                  onClick={() => {
                    setEditingItem({
                      item,
                      categoryName: editingCategoryName,
                      path: [...path, item.name]
                    });
                    setIsEditingItem(true);
                  }}
                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <PencilIcon className="w-4 h-4 text-white/40 hover:text-[#E6B980]" />
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory(editingCategoryName);
                    setSelectedPath([...path, item.name]);
                    setIsAddingSubcategory(true);
                    resetForm();
                  }}
                  className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <PlusIcon className="w-4 h-4 text-white/40 hover:text-[#E6B980]" />
                </button>
              </div>
            </div>
            {isExpanded && item.items && item.items.length > 0 && (
              <div className="border-l border-white/10 ml-6">
                {renderCategoryItems(item.items, [...path, item.name], level + 1)}
              </div>
            )}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-light tracking-wider text-center md:text-left">Панель администратора</h1>
          <Link href="/">
            <button className="w-full md:w-auto px-6 py-3 border border-[#333] rounded-full uppercase text-sm tracking-widest text-gray-500 transition-all hover:border-[#E6B980]/40 hover:text-[#E6B980]/40">
              ← На главную
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <div className="bg-black/30 p-6 rounded-lg border border-white/10">
              <h2 className="text-xl font-light mb-4 text-[#E6B980]">Категории</h2>
              <div className="space-y-4">
                {menuItems.map((category, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between group">
                      <button
                        onClick={() => {
                          const isNewCategory = selectedCategory !== category.category;
                          setSelectedCategory(category.category);
                          setSelectedPath([]);
                          setEditingCategoryName(category.category);
                          if (isNewCategory) {
                            setExpandedCategories([category.category]);
                          } else {
                            const isExpanded = expandedCategories.includes(category.category);
                            if (isExpanded) {
                              setExpandedCategories(expandedCategories.filter(p => p !== category.category));
                            } else {
                              setExpandedCategories([...expandedCategories, category.category]);
                            }
                          }
                        }}
                        className={`text-left flex-1 py-2 px-4 rounded-lg transition-colors ${
                          selectedCategory === category.category && selectedPath.length === 0
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {category.items.some(item => item.isSubcategory) && (
                            <svg
                              className={`w-4 h-4 transition-transform ${expandedCategories.includes(category.category) ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          <span>{category.category}</span>
                        </div>
                      </button>
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItemUp(category.category, category.items.map(item => item.name));
                          }}
                          className="bg-[#E6B980]/20 hover:bg-[#E6B980]/40 text-[#E6B980] px-2 py-1 rounded text-xs transition-colors"
                          title="Переместить вверх"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveItemDown(category.category, category.items.map(item => item.name));
                          }}
                          className="bg-[#E6B980]/20 hover:bg-[#E6B980]/40 text-[#E6B980] px-2 py-1 rounded text-xs transition-colors"
                          title="Переместить вниз"
                        >
                          ↓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategoryName(category.category);
                            setNewCategoryName(category.category);
                            setIsEditingCategory(true);
                          }}
                          className="p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <PencilIcon className="w-4 h-4 text-white/40 hover:text-[#E6B980]" />
                        </button>
                      </div>
                    </div>
                    {expandedCategories.includes(category.category) && category.items && category.items.length > 0 && (
                      <div className="border-l border-white/10 ml-6">
                        {renderCategoryItems(category.items, [], 1)}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setNewCategoryName('');
                    setIsAddingCategory(true);
                  }}
                  className="w-full text-left py-2 px-4 rounded-lg text-[#E6B980]/60 hover:text-[#E6B980] transition-colors flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Добавить категорию</span>
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-8">
            {selectedCategory && (
              <div className="bg-black/30 p-6 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-light text-[#E6B980]">
                      {selectedPath.length > 0 ? (
                        <>
                          {selectedCategory}
                          <span className="text-white/60">
                            {' → '}
                            {selectedPath.join(' → ')}
                          </span>
                        </>
                      ) : (
                        selectedCategory
                      )}
                    </h2>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setIsSubcategory(false);
                        setNewItem({
                          name: '',
                          price: '',
                          description: '',
                          image: '',
                          weight: '',
                          nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 }
                        });
                        setIsAddingItem(true);
                      }}
                      className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black px-3 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-2 flex-shrink-0"
                    >
                      Добавить блюдо
                    </button>
                    <button
                      onClick={() => {
                        setSelectedCategory(selectedCategory);
                        setIsAddingSubcategory(true);
                        setNewItem({
                          name: '',
                          price: '',
                          description: '',
                          image: '',
                          nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 },
                          isSubcategory: true,
                          level: selectedPath.length + 1,
                          items: []
                        });
                      }}
                      className="border border-[#E6B980]/20 text-[#E6B980]/60 py-1.5 px-3 text-xs rounded-lg font-medium tracking-wide hover:bg-[#E6B980]/5 transition-all"
                    >
                      + Подкатегория
                    </button>
                  </div>
                </div>
                <div className="space-y-2 mt-6">
                  {getCurrentItems().map((item) => renderMenuItem(item, [...selectedPath, item.name]))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования элемента */}
      {isEditingItem && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] p-4 sm:p-6 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-light text-[#E6B980]">
                  {editingItem?.item.isSubcategory ? 'Редактирование подкатегории' : 'Редактирование элемента'}
                </h2>
                <button
                  onClick={() => {
                    setIsEditingItem(false);
                    resetForm();
                  }}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {!editingItem?.item.isSubcategory && renderSubcategorySelect()}

                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({
                    ...newItem,
                    name: e.target.value
                  })}
                  placeholder="Название"
                  className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                />

                {!editingItem?.item.isSubcategory && (
                  <>
                    <textarea
                      value={newItem.description}
                      onChange={(e) => setNewItem({
                        ...newItem,
                        description: e.target.value
                      })}
                      placeholder="Описание"
                      className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors min-h-[80px]"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={newItem.price}
                        onChange={(e) => {
                          let price = e.target.value.replace(/₽/g, '').trim();
                          if (price) {
                            price = price.endsWith('₽') ? price : `${price}₽`;
                          }
                          setNewItem({
                            ...newItem,
                            price: price
                          });
                        }}
                        placeholder="Цена"
                        className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                      />

                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newItem.weight ? newItem.weight.replace(/[гмл]/g, '').trim() : ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setNewItem({
                              ...newItem,
                              weight: value ? `${value} ${weightUnit}` : ''
                            });
                          }}
                          placeholder="Вес/объем"
                          className="flex-1 bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                        <select
                          value={weightUnit}
                          onChange={(e) => {
                            setWeightUnit(e.target.value as 'г' | 'мл');
                            if (newItem.weight) {
                              const value = newItem.weight.replace(/[гмл]/g, '').trim();
                              setNewItem({
                                ...newItem,
                                weight: `${value} ${e.target.value}`
                              });
                            }
                          }}
                          className="w-20 bg-white/[0.02] border-0 border-b border-white/10 px-2 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        >
                          <option value="г" className="bg-[#0A0A0A]">гр</option>
                          <option value="мл" className="bg-[#0A0A0A]">мл</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-2">Изображение</label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, true)}
                          className="flex-1 w-full sm:w-auto p-2 border rounded text-sm"
                        />
                        {newItem.image && (
                          <div className="flex-shrink-0">
                            <img 
                              src={newItem.image} 
                              alt="Предпросмотр" 
                              className="w-20 h-20 object-cover rounded"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm text-[#E6B980]/70 mb-1">Калории (ккал)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.calories}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, calories: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm text-[#E6B980]/70 mb-1">Белки (г)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.protein}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, protein: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm text-[#E6B980]/70 mb-1">Жиры (г)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.fats}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, fats: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm text-[#E6B980]/70 mb-1">Углеводы (г)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.carbs}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, carbs: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={handleUpdateItem}
                    className="w-full sm:flex-1 bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity text-sm"
                  >
                    Сохранить изменения
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Вы уверены, что хотите удалить этот элемент?')) {
                        handleDeleteItem(editingItem!.categoryName, editingItem!.path);
                        setIsEditingItem(false);
                        resetForm();
                      }
                    }}
                    className="w-full sm:flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-500 py-2 px-4 rounded-lg font-medium tracking-wide transition-colors text-sm"
                  >
                    Удалить элемент
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingItem(false);
                      resetForm();
                    }}
                    className="w-full sm:flex-1 border border-[#E6B980]/30 text-[#E6B980] py-2 px-4 rounded-lg font-medium tracking-wide hover:bg-[#E6B980]/10 transition-all text-sm"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно добавления элемента */}
      {isAddingItem && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-light text-[#E6B980]">
                  Добавление элемента
                </h2>
                <button
                  onClick={() => {
                    setIsAddingItem(false);
                    const currentPath = selectedPath;
                    const currentExpandedCategories = expandedCategories;
                    resetForm();
                    setSelectedPath(currentPath);
                    setExpandedCategories(currentExpandedCategories);
                  }}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {renderSubcategorySelect()}

                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({
                    ...newItem,
                    name: e.target.value
                  })}
                  placeholder="Название"
                  className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                />

                {!isSubcategory && (
                  <>
                    <input
                      type="text"
                      value={newItem.price}
                      onChange={(e) => {
                        let price = e.target.value.replace(/₽/g, '').trim();
                        if (price) {
                          price = price.endsWith('₽') ? price : `${price}₽`;
                        }
                        setNewItem({
                          ...newItem,
                          price: price
                        });
                      }}
                      placeholder="Цена"
                      className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                    />

                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newItem.weight ? newItem.weight.replace(/[гмл]/g, '').trim() : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setNewItem({
                            ...newItem,
                            weight: value ? `${value} ${weightUnit}` : ''
                          });
                        }}
                        placeholder="Вес/объем"
                        className="flex-1 bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                      />
                      <select
                        value={weightUnit}
                        onChange={(e) => {
                          setWeightUnit(e.target.value as 'г' | 'мл');
                          if (newItem.weight) {
                            const value = newItem.weight.replace(/[гмл]/g, '').trim();
                            setNewItem({
                              ...newItem,
                              weight: `${value} ${e.target.value}`
                            });
                          }
                        }}
                        className="w-20 bg-white/[0.02] border-0 border-b border-white/10 px-2 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                      >
                        <option value="г" className="bg-[#0A0A0A]">гр</option>
                        <option value="мл" className="bg-[#0A0A0A]">мл</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-2">Изображение</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setNewItem({ ...newItem, image: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full p-2 border rounded"
                      />
                      {newItem.image && (
                        <div className="mt-2">
                          <img 
                            src={newItem.image} 
                            alt="Предпросмотр" 
                            className="w-24 h-24 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#E6B980]/70 mb-1">Калории (ккал)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.calories}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, calories: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#E6B980]/70 mb-1">Белки (г)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.protein}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, protein: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#E6B980]/70 mb-1">Жиры (г)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.fats}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, fats: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#E6B980]/70 mb-1">Углеводы (г)</label>
                        <input
                          type="number"
                          value={newItem.nutrition.carbs}
                          onChange={(e) => setNewItem({
                            ...newItem,
                            nutrition: { ...newItem.nutrition, carbs: parseInt(e.target.value) }
                          })}
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={async () => {
                      await handleAddItem();
                      setIsAddingItem(false);
                    }}
                    className="flex-1 bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
                  >
                    Добавить блюдо
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingItem(false);
                      const currentPath = selectedPath;
                      const currentExpandedCategories = expandedCategories;
                      resetForm();
                      setSelectedPath(currentPath);
                      setExpandedCategories(currentExpandedCategories);
                    }}
                    className="flex-1 border border-[#E6B980]/30 text-[#E6B980] py-2 px-4 rounded-lg font-medium tracking-wide hover:bg-[#E6B980]/10 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно редактирования категории */}
      {isEditingCategory && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-md">
              <h3 className="text-lg font-light mb-4 text-[#E6B980]">
                Редактирование категории
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Новое название категории"
                  className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  autoFocus
                />
                <div className="flex flex-col gap-4 pt-4">
                  <button
                    onClick={handleUpdateCategory}
                    className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(editingCategoryName)}
                    className="bg-red-500/10 text-red-500 border border-red-500/20 py-2 px-4 rounded-lg font-medium tracking-wide hover:bg-red-500/20 transition-all"
                  >
                    Удалить категорию
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно добавления подкатегории */}
      {isAddingSubcategory && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-light text-[#E6B980]">
                  Добавление подкатегории
                </h3>
                <button
                  onClick={() => {
                    setIsAddingSubcategory(false);
                    resetForm();
                  }}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="text-sm text-white/60">
                  <span>Добавление в:</span>
                  <span className="text-[#E6B980] ml-1">
                    {selectedCategory}
                    {selectedPath.length > 0 && ` → ${selectedPath.join(' → ')}`}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] md:text-xs text-[#E6B980] tracking-[0.15em] uppercase">
                    Название подкатегории
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Введите название подкатегории"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                    autoFocus
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    onClick={() => {
                      setIsAddingSubcategory(false);
                      resetForm();
                    }}
                    className="px-6 py-2 text-[#E6B980]/60 hover:text-[#E6B980] transition-colors text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleAddSubcategory}
                    disabled={!newItem.name.trim()}
                    className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-6 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно добавления категории */}
      {isAddingCategory && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-md">
              <h3 className="text-lg font-light mb-4 text-[#E6B980]">
                Добавление категории
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Название категории"
                  className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  autoFocus
                />
                <div className="flex flex-col gap-4 pt-4">
                  <button
                    onClick={handleAddCategory}
                    className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
                  >
                    Добавить
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 