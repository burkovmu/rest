'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { menuItems as initialMenuItems } from '@/components/Menu';
import { Dialog } from '@headlessui/react';
import { fetchMenu, updateMenu, uploadImage } from '@/utils/menuService';

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
  subcategory?: MenuItem[];
}

interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export default function AdminPage() {
  const [menuItems, setMenuItems] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [editingItem, setEditingItem] = useState<{item: MenuItem, categoryName: string, subcategoryName?: string} | null>(null);
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
        const data = await fetchMenu();
        if (Array.isArray(data)) {
          setMenuItems(data);
        }
      } catch (error) {
        console.error('Ошибка при загрузке меню:', error);
        // Используем локальные данные как резервные
        setMenuItems(initialMenuItems);
      }
    };

    loadMenu();
  }, []);

  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      try {
        localStorage.setItem('menuItems', JSON.stringify(menuItems));
      } catch (error) {
        console.error('Ошибка при сохранении меню:', error);
      }
    }
  }, [menuItems]);

  const handleAddCategory = async () => {
    if (newCategory.trim()) {
      const updatedMenu = [...menuItems, { category: newCategory, items: [] }];
      try {
        await updateMenu(updatedMenu);
        setMenuItems(updatedMenu);
        setNewCategory('');
      } catch (error) {
        console.error('Ошибка при добавлении категории:', error);
      }
    }
  };

  const validateImageUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('http')) {
        return 'URL должен начинаться с http:// или https://';
      }
      return '';
    } catch {
      return 'Неверный формат URL';
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log('Загрузка изображения...', file.name);
      const imageUrl = await uploadImage(file);
      console.log('Изображение загружено:', imageUrl);
      
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

  const handleAddItem = async () => {
    console.log('Начало добавления элемента:', newItem);
    
    if (imagePreviewError) {
      alert('Пожалуйста, исправьте ошибку с изображением');
      return;
    }

    if (!selectedCategory) {
      alert('Пожалуйста, выберите категорию');
      return;
    }

    if (!newItem.name) {
      alert('Пожалуйста, введите название');
      return;
    }

    // Проверяем цену только если это не подкатегория
    if (!isSubcategory && !selectedSubcategory && !newItem.price) {
      alert('Пожалуйста, введите цену');
      return;
    }

    // Проверяем изображение только если это не подкатегория
    if (!isSubcategory && !selectedSubcategory && !newItem.image) {
      alert('Пожалуйста, загрузите изображение');
      return;
    }

    try {
      console.log('Обновление меню...');
      const updatedMenu = menuItems.map(category => {
        if (category.category === selectedCategory) {
          if (isSubcategory) {
            // Создаем новую подкатегорию
            return {
              ...category,
              items: [...category.items, {
                name: newItem.name,
                price: '',
                description: newItem.description,
                image: '',
                nutrition: {
                  calories: 0,
                  protein: 0,
                  fats: 0,
                  carbs: 0
                },
                subcategory: []
              }]
            };
          } else if (selectedSubcategory) {
            // Добавляем элемент в существующую подкатегорию
            return {
              ...category,
              items: category.items.map(item => {
                if (item.name === selectedSubcategory) {
                  return {
                    ...item,
                    subcategory: [...(item.subcategory || []), {
                      ...newItem,
                      price: newItem.price.replace(/₽/g, '').trim() + '₽'
                    }]
                  };
                }
                return item;
              })
            };
          } else {
            // Добавляем обычный элемент в категорию
            return {
              ...category,
              items: [...category.items, {
                ...newItem,
                price: newItem.price.replace(/₽/g, '').trim() + '₽'
              }]
            };
          }
        }
        return category;
      });
      
      console.log('Сохранение обновленного меню...');
      await updateMenu(updatedMenu);
      console.log('Меню успешно обновлено');
      
      // Сбрасываем форму
      setMenuItems(updatedMenu);
      setNewItem({
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
      setSelectedCategory('');
      setSelectedSubcategory('');
      setIsSubcategory(false);
      alert('Элемент успешно добавлен!');
    } catch (error) {
      console.error('Ошибка при добавлении элемента:', error);
      alert('Произошла ошибка при добавлении элемента: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
    }
  };

  const handleEditItem = (categoryName: string, item: MenuItem, subcategoryName?: string) => {
    setEditingItem({ item, categoryName, subcategoryName });
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      weight: item.weight || '',
      nutrition: { ...item.nutrition }
    });
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    const updatedMenu = menuItems.map(category => {
      if (category.category === editingItem.categoryName) {
        return {
          ...category,
          items: category.items.map(item => {
            if (editingItem.subcategoryName) {
              if (item.name === editingItem.subcategoryName) {
                return {
                  ...item,
                  subcategory: (item.subcategory || []).map(subItem => 
                    subItem.name === editingItem.item.name
                      ? { ...newItem, price: newItem.price.replace(/₽/g, '').trim() + '₽' }
                      : subItem
                  )
                };
              }
            } else if (item.name === editingItem.item.name) {
              return { ...newItem, price: newItem.price.replace(/₽/g, '').trim() + '₽' };
            }
            return item;
          })
        };
      }
      return category;
    });

    try {
      await updateMenu(updatedMenu);
      setMenuItems(updatedMenu);
      setEditingItem(null);
      setNewItem({
        name: '',
        price: '',
        description: '',
        image: '',
        weight: '',
        nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 }
      });
    } catch (error) {
      console.error('Ошибка при обновлении блюда:', error);
    }
  };

  const handleDeleteItem = async (categoryName: string, itemName: string, subcategoryName?: string) => {
    if (!confirm('Вы уверены, что хотите удалить это блюдо?')) return;

    const updatedMenu = menuItems.map(category => {
      if (category.category === categoryName) {
        return {
          ...category,
          items: category.items.map(item => {
            if (subcategoryName && item.name === subcategoryName) {
              return {
                ...item,
                subcategory: (item.subcategory || []).filter(subItem => subItem.name !== itemName)
              };
            }
            return item;
          }).filter(item => item.name !== itemName || subcategoryName)
        };
      }
      return category;
    });

    try {
      await updateMenu(updatedMenu);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при удалении блюда:', error);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const updatedMenu = menuItems.filter(category => category.category !== categoryName);
    try {
      await updateMenu(updatedMenu);
      setMenuItems(updatedMenu);
    } catch (error) {
      console.error('Ошибка при удалении категории:', error);
    }
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Форма добавления категории */}
          <div className="bg-black/30 p-6 rounded-lg border border-white/10">
            <h2 className="text-xl font-light mb-4 text-[#E6B980]">Добавить категорию</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Название категории"
                className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
              />
              <button
                onClick={handleAddCategory}
                className="w-full bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
              >
                Добавить категорию
              </button>
            </div>
          </div>

          {/* Форма добавления блюда */}
          <div className="bg-black/30 p-6 rounded-lg border border-white/10">
            <h2 className="text-xl font-light mb-4 text-[#E6B980]">
              {isSubcategory ? "Добавить подкатегорию" : "Добавить блюдо"}
            </h2>
            <div className="space-y-4">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('');
                  setIsSubcategory(false);
                }}
                className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
              >
                <option value="">Выберите категорию</option>
                {menuItems.map((category, index) => (
                  <option key={index} value={category.category}>
                    {category.category}
                  </option>
                ))}
              </select>

              {selectedCategory && !isSubcategory && (
                <select
                  value={selectedSubcategory}
                  onChange={(e) => {
                    setSelectedSubcategory(e.target.value);
                  }}
                  className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                >
                  <option value="">Выберите подкатегорию (необязательно)</option>
                  {menuItems
                    .find(cat => cat.category === selectedCategory)
                    ?.items
                    .filter(item => item.subcategory)
                    .map((item, index) => (
                      <option key={index} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                </select>
              )}

              {selectedCategory && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isSubcategory}
                    onChange={(e) => {
                      setIsSubcategory(e.target.checked);
                      if (e.target.checked) {
                        setSelectedSubcategory('');
                        setNewItem({
                          ...newItem,
                          price: '',
                          image: '',
                          weight: '',
                          nutrition: {
                            calories: 0,
                            protein: 0,
                            fats: 0,
                            carbs: 0
                          },
                          subcategory: []
                        });
                      }
                    }}
                    className="w-4 h-4 bg-white/[0.02] border border-white/10 rounded focus:ring-[#E6B980]"
                    disabled={!!selectedSubcategory}
                  />
                  <label className="text-sm text-white/90">
                    Это подкатегория
                    <span className="text-xs text-gray-400 ml-2">
                      (например: "Вина", "Крепкий алкоголь")
                    </span>
                  </label>
                </div>
              )}

              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder={isSubcategory ? "Название подкатегории" : "Название блюда"}
                className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
              />

              {!isSubcategory && (
                <>
                  <input
                    type="text"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="Цена (только число)"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  />

                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder={isSubcategory ? "Описание подкатегории" : "Описание блюда"}
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors min-h-[80px]"
                  />

                  <input
                    type="text"
                    value={newItem.weight || ''}
                    onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                    placeholder="Вес/объем (например: 250 г)"
                    className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                  />

                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, false)}
                      className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                    />
                    {imagePreviewError && (
                      <p className="text-red-500 text-xs">{imagePreviewError}</p>
                    )}
                    {newItem.image && !imagePreviewError && (
                      <div className="relative aspect-[4/3] mt-2 rounded-lg overflow-hidden">
                        <Image
                          src={newItem.image}
                          alt="Предпросмотр"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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

              <button
                onClick={handleAddItem}
                className="w-full bg-gradient-to-r from-[#E6B980] to-[#D4A56A] text-black py-2 px-4 rounded-lg font-medium tracking-wide hover:opacity-90 transition-opacity"
              >
                {isSubcategory ? "Добавить подкатегорию" : "Добавить блюдо"}
              </button>
            </div>
          </div>
        </div>

        {/* Список категорий и блюд */}
        <div className="mt-12 space-y-8">
          {menuItems.map((category: MenuCategory, categoryIndex: number) => (
            <motion.div
              key={categoryIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-black/30 p-6 rounded-lg border border-white/10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-light text-[#E6B980]">{category.category}</h3>
                <button
                  onClick={() => handleDeleteCategory(category.category)}
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  Удалить категорию
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item: MenuItem, itemIndex: number) => (
                  <motion.div
                    key={itemIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative group bg-black/20 rounded-lg overflow-hidden"
                  >
                    {item.subcategory ? (
                      // Отображение подкатегории
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-light mb-2">{item.name}</h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditItem(category.category, item)}
                              className="bg-[#E6B980]/80 hover:bg-[#E6B980] text-black rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteItem(category.category, item.name)}
                              className="bg-red-500/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                        <p className="text-[#E6B980] mb-2">Подкатегория</p>
                        
                        <div className="space-y-2">
                          {item.subcategory.map((subItem, subIndex) => (
                            <div key={subIndex} className="bg-black/30 p-2 rounded group">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm">{subItem.name}</span>
                                  <span className="text-[#E6B980] text-sm ml-2">{subItem.price}</span>
                                </div>
                                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleEditItem(category.category, subItem, item.name)}
                                    className="bg-[#E6B980]/80 hover:bg-[#E6B980] text-black rounded-full w-5 h-5 flex items-center justify-center transition-colors text-xs"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(category.category, subItem.name, item.name)}
                                    className="bg-red-500/80 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400">{subItem.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Отображение обычного элемента
                      <>
                        <div className="aspect-[4/3] relative">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
                          <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditItem(category.category, item)}
                              className="bg-[#E6B980]/80 hover:bg-[#E6B980] text-black rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteItem(category.category, item.name)}
                              className="bg-red-500/80 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        <div className="p-4">
                          <h4 className="text-lg font-light mb-2">{item.name}</h4>
                          <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                          <p className="text-[#E6B980]">{item.price}</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Модальное окно редактирования */}
      <Dialog
        open={editingItem !== null}
        onClose={() => {
          setEditingItem(null);
          setNewItem({
            name: '',
            price: '',
            description: '',
            image: '',
            weight: '',
            nutrition: { calories: 0, protein: 0, fats: 0, carbs: 0 }
          });
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-2xl bg-gradient-to-br from-[#0A0A0A] to-[#141414] p-8 shadow-[0_0_50px_rgba(230,185,128,0.1)] border border-white/10 my-8">
              {editingItem && (
                <div className="space-y-6">
                  <Dialog.Title className="text-2xl font-light text-[#E6B980] mb-6">
                    {editingItem.subcategoryName 
                      ? `Редактировать элемент в подкатегории "${editingItem.subcategoryName}"`
                      : editingItem.item.subcategory 
                        ? `Редактировать подкатегорию "${editingItem.item.name}"`
                        : 'Редактировать блюдо'
                    }
                  </Dialog.Title>

                  <div className="space-y-6">
                    <input
                      type="text"
                      value={editingItem.item.name}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, name: e.target.value }
                      })}
                      placeholder={editingItem.item.subcategory ? "Название подкатегории" : "Название блюда"}
                      className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                    />

                    <input
                      type="text"
                      value={editingItem.item.price}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, price: e.target.value }
                      })}
                      placeholder="Цена (только число)"
                      className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                    />

                    <textarea
                      value={editingItem.item.description}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        item: { ...editingItem.item, description: e.target.value }
                      })}
                      placeholder={editingItem.item.subcategory ? "Описание подкатегории" : "Описание блюда"}
                      className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors min-h-[80px]"
                    />

                    {/* Показываем дополнительные поля только если это не подкатегория */}
                    {!editingItem.item.subcategory && (
                      <>
                        <input
                          type="text"
                          value={editingItem.item.price}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            item: { ...editingItem.item, price: e.target.value }
                          })}
                          placeholder="Цена"
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />

                        <input
                          type="text"
                          value={editingItem.item.weight || ''}
                          onChange={(e) => setEditingItem({
                            ...editingItem,
                            item: { ...editingItem.item, weight: e.target.value }
                          })}
                          placeholder="Вес/объем (например: 250 г)"
                          className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                        />

                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, true)}
                            className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                          />
                          {imagePreviewError && (
                            <p className="text-red-500 text-xs">{imagePreviewError}</p>
                          )}
                          {editingItem.item.image && !imagePreviewError && (
                            <div className="relative aspect-[4/3] mt-2 rounded-lg overflow-hidden">
                              <Image
                                src={editingItem.item.image}
                                alt="Предпросмотр"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-[#E6B980]/70 mb-1">Калории (ккал)</label>
                            <input
                              type="number"
                              value={editingItem.item.nutrition.calories}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                item: {
                                  ...editingItem.item,
                                  nutrition: { ...editingItem.item.nutrition, calories: parseInt(e.target.value) }
                                }
                              })}
                              className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-[#E6B980]/70 mb-1">Белки (г)</label>
                            <input
                              type="number"
                              value={editingItem.item.nutrition.protein}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                item: {
                                  ...editingItem.item,
                                  nutrition: { ...editingItem.item.nutrition, protein: parseInt(e.target.value) }
                                }
                              })}
                              className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-[#E6B980]/70 mb-1">Жиры (г)</label>
                            <input
                              type="number"
                              value={editingItem.item.nutrition.fats}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                item: {
                                  ...editingItem.item,
                                  nutrition: { ...editingItem.item.nutrition, fats: parseInt(e.target.value) }
                                }
                              })}
                              className="w-full bg-white/[0.02] border-0 border-b border-white/10 px-4 py-2 text-white/90 text-sm font-light focus:outline-none focus:border-[#E6B980]/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-[#E6B980]/70 mb-1">Углеводы (г)</label>
                            <input
                              type="number"
                              value={editingItem.item.nutrition.carbs}
                              onChange={(e) => setEditingItem({
                                ...editingItem,
                                item: {
                                  ...editingItem.item,
                                  nutrition: { ...editingItem.item.nutrition, carbs: parseInt(e.target.value) }
                                }
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
                        onClick={() => setEditingItem(null)}
                        className="flex-1 border border-[#E6B980]/30 text-[#E6B980] py-2 px-4 rounded-lg font-medium tracking-wide hover:bg-[#E6B980]/10 transition-all"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </div>
  );
} 