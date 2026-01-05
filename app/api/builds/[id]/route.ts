import { NextResponse } from 'next/server';
import { FileSystemBuildRepository } from '@/infrastructure/FileSystemBuildRepository';
import { EditBuildUseCase } from '@/use-cases/editBuild';
import { DeleteBuildUseCase } from '@/use-cases/deleteBuild';
import { ValidationError } from '@/domain/validation';

const repository = new FileSystemBuildRepository();

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const useCase = new EditBuildUseCase(repository);
    const updatedBuild = await useCase.execute(id, updates);

    return NextResponse.json(updatedBuild);
  } catch (error) {
    console.error('Failed to update build:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to update build' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const useCase = new DeleteBuildUseCase(repository);
    await useCase.execute(id);

    return NextResponse.json({ message: 'Build deleted successfully' });
  } catch (error) {
    console.error('Failed to delete build:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete build' }, { status: 500 });
  }
}

