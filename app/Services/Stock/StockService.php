<?php

namespace App\Services\Stock;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class StockService
{
    public function record(
        Product $product,
        int $quantity,
        StockMovementType $type,
        ?User $user = null,
        ?Model $reference = null,
        ?string $note = null,
        string $errorKey = 'quantity',
    ): StockMovement {
        $balance = $product->stock_on_hand + $quantity;

        if ($balance < 0) {
            throw ValidationException::withMessages([
                $errorKey => "Not enough stock for {$product->name}: {$product->stock_on_hand} available.",
            ]);
        }

        $product->forceFill(['stock_on_hand' => $balance])->save();

        return $product->stockMovements()->create([
            'user_id' => $user?->id,
            'type' => $type,
            'quantity' => $quantity,
            'balance_after' => $balance,
            'reference_type' => $reference?->getMorphClass(),
            'reference_id' => $reference?->getKey(),
            'note' => $note,
            'occurred_at' => now(),
        ]);
    }

    public function adjust(Product $product, User $user, int $quantity, string $note): StockMovement
    {
        return DB::transaction(function () use ($product, $user, $quantity, $note) {
            $locked = Product::lockForUpdate()->findOrFail($product->id);

            return $this->record($locked, $quantity, StockMovementType::Adjustment, $user, note: $note);
        });
    }

    /**
     * @return LengthAwarePaginator<int, StockMovement>
     */
    public function history(Product $product, int $perPage): LengthAwarePaginator
    {
        return $product->stockMovements()
            ->with(['user:id,name', 'reference'])
            ->latest('occurred_at')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();
    }
}
