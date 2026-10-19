<?php

namespace Tests\Unit\PurchaseOrder;

use App\Enums\PurchaseOrderStatus;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Services\PurchaseOrder\PurchaseOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PurchaseOrderServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_placed_order_adds_its_units_to_stock_when_received(): void
    {
        $product = Product::factory()->withStock(5)->create();
        $order = $this->draft($product, 12);

        $order = $this->service()->place($order);
        $this->assertSame(PurchaseOrderStatus::Ordered, $order->status);
        $this->assertNotNull($order->ordered_at);
        $this->assertNotNull($order->expected_at);

        $order = $this->service()->receive($order, $order->creator);
        $this->assertSame(PurchaseOrderStatus::Received, $order->status);
        $this->assertSame(17, $product->fresh()->stock_on_hand);
    }

    public function test_a_draft_can_be_cancelled(): void
    {
        $order = $this->service()->cancel($this->draft(Product::factory()->create(), 3));

        $this->assertSame(PurchaseOrderStatus::Cancelled, $order->status);
        $this->assertNotNull($order->cancelled_at);
    }

    public function test_an_order_without_items_cannot_be_placed(): void
    {
        $order = $this->draft(Product::factory()->create(), 3);
        $order->items()->delete();

        $this->expectValidationError(fn () => $this->service()->place($order), 'Add at least one item');
        $this->assertSame(PurchaseOrderStatus::Draft, $order->fresh()->status);
    }

    public function test_a_received_order_cannot_be_cancelled(): void
    {
        $order = $this->service()->place($this->draft(Product::factory()->create(), 3));
        $order = $this->service()->receive($order, $order->creator);

        $this->expectValidationError(fn () => $this->service()->cancel($order), 'A received purchase order cannot be marked as cancelled.');
        $this->assertSame(PurchaseOrderStatus::Received, $order->fresh()->status);
    }

    private function draft(Product $product, int $quantity): PurchaseOrder
    {
        return $this->service()->create([
            'supplier_id' => $product->supplier_id,
            'items' => [['product_id' => $product->id, 'quantity' => $quantity, 'unit_cost' => 10]],
        ], User::factory()->create());
    }

    private function expectValidationError(callable $action, string $message): void
    {
        try {
            $action();
            $this->fail('Expected a validation error.');
        } catch (ValidationException $exception) {
            $this->assertStringContainsString($message, $exception->errors()['status'][0]);
        }
    }

    private function service(): PurchaseOrderService
    {
        return app(PurchaseOrderService::class);
    }
}
