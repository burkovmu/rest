'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { menuItems as initialMenuItems } from '@/components/Menu';
import { Dialog } from '@headlessui/react';
import { menuService } from '@/services/menuService';

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
    if (newCategory.trim()) {
      try {
        const updatedMenu = await menuService.addCategory(menuItems, newCategory);
        setMenuItems(updatedMenu);
        setNewCategory('');
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

  const handleAddItem = async () => {
    if (!selectedCategory) {
      alert('Пожалуйста, выберите категорию');
      return;
    }

    if (!newItem.name) {
      alert('Пожалуйста, введите название');
      return;
    }

    const currentLevel = selectedPath.length;
    if (currentLevel >= 3 && isSubcategory) {
      alert('Максимальный уровень вложенности - 3');
      return;
    }

    try {
      const itemToAdd: MenuItem = {
        ...newItem,
        isSubcategory,
        level: currentLevel + 1,
        items: isSubcategory ? [] : undefined,
        price: !isSubcategory ? newItem.price.replace(/₽/g, '').trim() + '₽' : ''
      };

      const updatedMenu = await menuService.addItem(
        menuItems,
        selectedCategory,
        itemToAdd,
        selectedPath
      );

      setMenuItems(updatedMenu);
      resetForm();
      alert('Элемент успешно добавлен!');
    } catch (error) {
      console.error('Ошибка при добавлении элемента:', error);
      alert('Произошла ошибка при добавлении элемента');
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
    setSelectedPath([]);
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
    if (!selectedCategory || !newItem.name) {
      alert('Пожалуйста, выберите категорию и введите название подкатегории');
      return;
    }

    const currentLevel = selectedPath.length;
    if (currentLevel >= 3) {
      alert('Максимальный уровень вложенности - 3');
      return;
    }

    try {
      const subcategoryToAdd: MenuItem = {
        name: newItem.name,
        price: '',
        description: newItem.description || 'Подкатегория',
        image: '',
        nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 },
        isSubcategory: true,
        level: currentLevel + 1,
        items: []
      };

      const updatedMenu = await menuService.addItem(
        menuItems,
        selectedCategory,
        subcategoryToAdd,
        selectedPath
      );

      setMenuItems(updatedMenu);
      resetForm();
      alert('Подкатегория успешно добавлена!');
    } catch (error) {
      console.error('Ошибка при добавлении подкатегории:', error);
      alert('Произошла ошибка при добавлении подкатегории');
    }
  };

  const renderMenuItem = (item: MenuItem, path: string[], level: number = 0) => {
    if (level >= 3) return null;

    return (
      <div key={item.name} className={`pl-${level * 4} py-2 border-l-2 border-white/5 hover:border-[#E6B980]/20 transition-colors`}>
        <div className="flex items-center justify-between group">
          <div className="flex items-center space-x-4">
            {item.isSubcategory ? (
              <svg className="w-4 h-4 text-[#E6B980]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <div className="w-4 h-4 rounded-full bg-white/10" />
            )}
            <div className="flex items-center space-x-2">
              <span className="text-white group-hover:text-[#E6B980] transition-colors">{item.name}</span>
              {!item.isSubcategory && (
                <span className="text-[#E6B980] text-sm">{item.price}</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setSelectedPath(path.slice(0, -1));
                handleEditItem(selectedCategory, item, path);
              }}
              className="bg-[#E6B980]/80 hover:bg-[#E6B980] text-black rounded-full w-6 h-6 flex items-center justify-center"
            >
              ✎
            </button>
            <button
              onClick={() => handleDeleteItem(selectedCategory, path)}
              className="bg-red-500/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>
        {item.isSubcategory && item.items && item.items.length > 0 && (
          <div className="ml-4 mt-2">
            {item.items.map((subItem) =>
              renderMenuItem(subItem, [...path, subItem.name], level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryTree = (category: MenuCategory) => {
    const renderSubcategories = (items: MenuItem[], level: number = 0, parentPath: string[] = []): React.ReactNode => {
      if (level >= 3) return null;
      
      return items
        .filter(item => item.isSubcategory)
        .map((item) => (
          <div key={item.name} className="ml-4">
            <div className={`p-2 rounded-lg cursor-pointer transition-all mt-2 ${
              selectedCategory === category.category && JSON.stringify(selectedPath) === JSON.stringify([...parentPath, item.name])
                ? 'bg-[#E6B980]/10 border border-[#E6B980]/30'
                : 'bg-white/[0.02] border border-white/10 hover:border-[#E6B980]/20'
            }`}
            onClick={() => {
              setSelectedCategory(category.category);
              setSelectedPath([...parentPath, item.name]);
            }}>
              <div className="flex items-center justify-between group">
                <div className="flex items-center space-x-2">
                  <span className="text-[#E6B980] text-xs">↳</span>
                  <span className="text-sm font-light">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
                  {level < 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category.category);
                        setSelectedPath([...parentPath, item.name]);
                        setNewItem({
                          name: '',
                          price: '',
                          description: 'Подкатегория',
                          image: '',
                          nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 },
                          isSubcategory: true,
                          level: level + 2,
                          items: []
                        });
                        setIsAddingSubcategory(true);
                      }}
                      className="bg-[#E6B980]/20 hover:bg-[#E6B980]/40 text-[#E6B980] px-2 py-1 rounded text-xs transition-colors"
                      title="Добавить подкатегорию"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
            {item.items && renderSubcategories(item.items, level + 1, [...parentPath, item.name])}
          </div>
        ));
    };

    return (
      <div key={category.category} className="space-y-2">
        <div
          className={`p-3 rounded-lg cursor-pointer transition-all ${
            selectedCategory === category.category && selectedPath.length === 0
              ? 'bg-[#E6B980]/10 border border-[#E6B980]/30'
              : 'bg-white/[0.02] border border-white/10 hover:border-[#E6B980]/20'
          }`}
          onClick={() => {
            setSelectedCategory(category.category);
            setSelectedPath([]);
          }}
        >
          <div className="flex items-center justify-between group">
            <span className="text-sm font-light">{category.category}</span>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCategory(category.category);
                  setSelectedPath([]);
                  setNewItem({
                    name: '',
                    price: '',
                    description: 'Подкатегория',
                    image: '',
                    nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 },
                    isSubcategory: true,
                    level: 1,
                    items: []
                  });
                  setIsAddingSubcategory(true);
                }}
                className="bg-[#E6B980]/20 hover:bg-[#E6B980]/40 text-[#E6B980] px-2 py-1 rounded text-xs transition-colors"
                title="Добавить подкатегорию"
              >
                +
              </button>
            </div>
          </div>
        </div>
        {renderSubcategories(category.items)}
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
                {isAddingSubcategory ? (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-md">
                      <h3 className="text-lg font-light mb-4 text-[#E6B980]">
                        Добавление подкатегории
                      </h3>
                      <div className="space-y-4">
                        <div className="text-sm text-white/60">
                          Категория: {selectedCategory}
                          {selectedPath.length > 0 && (
                            <span className="text-[#E6B980]">
                              {' → '}
                              {selectedPath.join(' → ')}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="Название подкатегории"
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                          autoFocus
                        />
                        <div className="flex justify-end space-x-4 pt-4">
                          <button
                            onClick={() => {
                              setIsAddingSubcategory(false);
                              resetForm();
                            }}
                            className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={handleAddSubcategory}
                            className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
                          >
                            Добавить
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Новая категория"
                      className="flex-1 bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                    />
                    <button
                      onClick={handleAddCategory}
                      className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
                    >
                      +
                    </button>
                  </div>
                )}

                <div className="space-y-4 mt-4">
                  {menuItems.map(renderCategoryTree)}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 space-y-8">
            {selectedCategory && (
              <div className="bg-black/30 p-6 rounded-lg border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-light text-[#E6B980]">
                    Содержимое категории "{selectedCategory}"
                  </h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setIsAddingItem(true)}
                      className="bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-90"
                    >
                      + Добавить блюдо
                    </button>
                    {selectedCategory && (
                      <button
                        onClick={() => handleDeleteCategory(selectedCategory)}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-500 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Удалить категорию
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {menuItems
                    .find(cat => cat.category === selectedCategory)
                    ?.items?.map((item) => renderMenuItem(item, [item.name])) || []}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования элемента */}
      {isEditingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-[#E6B980]">
                Редактирование элемента
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

              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({
                  ...newItem,
                  description: e.target.value
                })}
                placeholder="Описание"
                className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors min-h-[80px]"
              />

              {!editingItem?.item.isSubcategory && (
                <>
                  <input
                    type="text"
                    value={newItem.price}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      price: e.target.value
                    })}
                    placeholder="Цена"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  />

                  <input
                    type="text"
                    value={newItem.weight || ''}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      weight: e.target.value
                    })}
                    placeholder="Вес/объем (например: 250 г)"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">Изображение</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, true)}
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
                  onClick={handleUpdateItem}
                  className="flex-1 bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
                >
                  Сохранить изменения
                </button>
                <button
                  onClick={() => {
                    setIsEditingItem(false);
                    resetForm();
                  }}
                  className="flex-1 border border-[#E6B980]/30 text-[#E6B980] py-2 px-4 rounded-lg font-medium tracking-wide hover:bg-[#E6B980]/10 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления элемента */}
      {isAddingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] p-6 rounded-lg border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-[#E6B980]">
                Добавление элемента
              </h2>
              <button
                onClick={() => {
                  setIsAddingItem(false);
                  resetForm();
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

              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({
                  ...newItem,
                  description: e.target.value
                })}
                placeholder="Описание"
                className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors min-h-[80px]"
              />

              {!isSubcategory && (
                <>
                  <input
                    type="text"
                    value={newItem.price}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      price: e.target.value
                    })}
                    placeholder="Цена"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  />

                  <input
                    type="text"
                    value={newItem.weight || ''}
                    onChange={(e) => setNewItem({
                      ...newItem,
                      weight: e.target.value
                    })}
                    placeholder="Вес/объем (например: 250 г)"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  />

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
                    resetForm();
                  }}
                  className="flex-1 border border-[#E6B980]/30 text-[#E6B980] py-2 px-4 rounded-lg font-medium tracking-wide hover:bg-[#E6B980]/10 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 