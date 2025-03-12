import { NextResponse } from 'next/server';
import { MenuCategory } from '@/types/menu';
import { menuItems as initialMenuItems } from '@/components/Menu';

export const runtime = 'edge';

export async function GET() {
  try {
    // В Edge Runtime мы не можем использовать localStorage напрямую
    // Поэтому возвращаем initialMenuItems как резервные данные
    return NextResponse.json(initialMenuItems);
  } catch (error) {
    console.error('Ошибка при чтении меню:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке меню' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const menu: MenuCategory[] = await request.json();
    // В Edge Runtime мы не можем сохранять данные
    // Клиент будет использовать localStorage для хранения
    return NextResponse.json({ message: 'Меню успешно обновлено' });
  } catch (error) {
    console.error('Ошибка при обновлении меню:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении меню' },
      { status: 500 }
    );
  }
} 