import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const uploadsDir = path.join(process.cwd(), 'public/uploads');

// Новый способ конфигурации для route handlers
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    // Создаем директорию для загрузок, если она не существует
    await fs.mkdir(uploadsDir, { recursive: true });

    // Генерируем уникальное имя файла
    const fileExtension = path.extname(file.name);
    const fileName = crypto.randomBytes(16).toString('hex') + fileExtension;
    const filePath = path.join(uploadsDir, fileName);

    // Читаем и сохраняем файл
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Возвращаем URL файла
    const fileUrl = `/uploads/${fileName}`;
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    );
  }
} 