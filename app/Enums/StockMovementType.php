<?php

namespace App\Enums;

enum StockMovementType: string
{
    case Opening = 'opening';
    case Sale = 'sale';
    case Purchase = 'purchase';
    case Adjustment = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::Opening => 'Opening balance',
            self::Sale => 'Sale',
            self::Purchase => 'Purchase receipt',
            self::Adjustment => 'Adjustment',
        };
    }
}