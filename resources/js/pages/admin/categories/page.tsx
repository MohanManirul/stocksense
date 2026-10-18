import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { Button, Card, CardHeader, ConfirmButton, EmptyState, Input, LoadError, TableSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { useApiForm } from '@/config/useApiForm';
import { usePermissions } from '@/config/usePermissions';
import { toast } from '@/lib/toast';
import { createCategory, deleteCategory, getCategories, updateCategory } from './api';
import type { Category } from './types';

export default function Categories() {
    const can = usePermissions();
    const { state, reload } = useApi(getCategories);
    const form = useApiForm({ name: '' });

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        if (await form.submit(createCategory)) {
            form.reset();
            toast.success('Category created.');
            reload();
        }
    };

    return (
        <div className="mx-auto max-w-3xl">
            <AdminPageLayout title="Categories" description="Group products so they are easier to find and report on.">
                {can('create categories') && (
                    <Card className="mb-6">
                        <form onSubmit={submit} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:px-5" noValidate>
                            <div className="flex-1">
                                <Input
                                    placeholder="New category name"
                                    aria-label="New category name"
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    error={form.errors.name}
                                />
                                {form.errors.name && <p className="mt-1.5 text-sm text-red-600">{form.errors.name}</p>}
                            </div>
                            <Button type="submit" processing={form.processing} icon={<Plus className="size-4" aria-hidden />}>
                                Add category
                            </Button>
                        </form>
                    </Card>
                )}

                {state.status === 'error' ? (
                    <LoadError message={state.message} onRetry={reload} />
                ) : (
                    <Card>
                        <CardHeader title={state.status === 'success' ? `${state.data.length} categories` : 'Categories'} />
                        {state.status === 'loading' ? (
                            <TableSkeleton rows={4} />
                        ) : state.data.length === 0 ? (
                            <EmptyState icon={<Tags className="size-5" />} title="No categories yet" description="Create one above before adding products." />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {state.data.map((category) => (
                                    <CategoryRow key={category.id} category={category} canEdit={can('edit categories')} canDelete={can('delete categories')} onChange={reload} />
                                ))}
                            </ul>
                        )}
                    </Card>
                )}
            </AdminPageLayout>
        </div>
    );
}

function CategoryRow({ category, canEdit, canDelete, onChange }: { category: Category; canEdit: boolean; canDelete: boolean; onChange: () => void }) {
    const [editing, setEditing] = useState(false);
    const form = useApiForm({ name: category.name });

    const save = async (event: FormEvent) => {
        event.preventDefault();

        if (await form.submit((data) => updateCategory(category.id, data))) {
            setEditing(false);
            toast.success('Category renamed.');
            onChange();
        }
    };

    const remove = async () => {
        await deleteCategory(category.id);
        toast.success('Category deleted.');
        onChange();
    };

    if (editing) {
        return (
            <li className="px-4 py-3 sm:px-5">
                <form onSubmit={save} className="flex items-start gap-2" noValidate>
                    <div className="flex-1">
                        <Input autoFocus aria-label="Category name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />
                        {form.errors.name && <p className="mt-1.5 text-sm text-red-600">{form.errors.name}</p>}
                    </div>
                    <Button type="submit" processing={form.processing} icon={<Check className="size-4" aria-hidden />}>
                        Save
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            form.reset();
                            setEditing(false);
                        }}
                        aria-label="Cancel"
                    >
                        <X className="size-4" />
                    </Button>
                </form>
            </li>
        );
    }

    return (
        <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{category.name}</p>
                <p className="text-xs text-slate-500">{category.products_count} products</p>
            </div>
            <div className="flex items-center gap-1">
                {canEdit && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            form.setData('name', category.name);
                            setEditing(true);
                        }}
                        icon={<Pencil className="size-3.5" aria-hidden />}
                    >
                        Rename
                    </Button>
                )}
                {canDelete && (
                    <ConfirmButton
                        onConfirm={remove}
                        title={`Delete “${category.name}”?`}
                        description={category.products_count ? 'This category still has products. Move them to another category first.' : 'This cannot be undone.'}
                        confirmLabel="Delete"
                        variant="danger"
                        triggerVariant="ghost"
                        size="sm"
                        icon={<Trash2 className="size-3.5" aria-hidden />}
                    >
                        Delete
                    </ConfirmButton>
                )}
            </div>
        </li>
    );
}
