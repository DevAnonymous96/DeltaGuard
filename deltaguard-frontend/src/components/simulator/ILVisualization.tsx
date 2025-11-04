'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { generateILCurve } from '@/lib/calculations/ilCalculator';

export function ILVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentPrice, lowerBound, upperBound, result } = useSimulatorStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate IL curve data
    const curveData = generateILCurve(currentPrice, 200);
    
    // Find max IL for scaling
    const maxIL = Math.max(...curveData.map(d => d.il));
    
    // Padding
    const padding = { top: 40, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Scale functions
    const xScale = (price: number) => {
      const minPrice = currentPrice * 0.2;
      const maxPrice = currentPrice * 5;
      return padding.left + ((price - minPrice) / (maxPrice - minPrice)) * chartWidth;
    };

    const yScale = (il: number) => {
      return padding.top + chartHeight - (il / Math.max(maxIL, 50)) * chartHeight;
    };

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (i / 10) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw IL curve
    ctx.beginPath();
    ctx.strokeStyle = 'oklch(0.704 0.191 22.216)'; // Destructive color
    ctx.lineWidth = 3;
    
    curveData.forEach((point, i) => {
      const x = xScale(point.price);
      const y = yScale(point.il);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill area under curve
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.lineTo(xScale(curveData[curveData.length - 1].price), height - padding.bottom);
    ctx.lineTo(xScale(curveData[0].price), height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw price range box
    const lowerX = xScale(lowerBound);
    const upperX = xScale(upperBound);
    
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.fillRect(lowerX, padding.top, upperX - lowerX, chartHeight);
    
    ctx.strokeStyle = 'oklch(0.7 0.25 280)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(lowerX, padding.top, upperX - lowerX, chartHeight);
    ctx.setLineDash([]);

    // Draw current price line
    const currentX = xScale(currentPrice);
    ctx.beginPath();
    ctx.strokeStyle = 'oklch(0.7 0.25 280)';
    ctx.lineWidth = 2;
    ctx.moveTo(currentX, padding.top);
    ctx.lineTo(currentX, height - padding.bottom);
    ctx.stroke();

    // Draw current price dot
    ctx.beginPath();
    ctx.fillStyle = 'oklch(0.7 0.25 280)';
    ctx.arc(currentX, yScale(0), 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulse effect for current price
    ctx.beginPath();
    ctx.strokeStyle = 'oklch(0.7 0.25 280 / 0.3)';
    ctx.lineWidth = 3;
    ctx.arc(currentX, yScale(0), 10, 0, Math.PI * 2);
    ctx.stroke();

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // X-axis labels
    const priceLabels = [
      { price: currentPrice * 0.5, label: '0.5x' },
      { price: currentPrice, label: '1x' },
      { price: currentPrice * 2, label: '2x' },
      { price: currentPrice * 4, label: '4x' },
    ];

    priceLabels.forEach(({ price, label }) => {
      const x = xScale(price);
      ctx.fillText(label, x, height - padding.bottom + 20);
    });

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const il = (maxIL / 5) * i;
      const y = yScale(il);
      ctx.fillText(`${il.toFixed(0)}%`, padding.left - 10, y + 4);
    }

    // Draw titles
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Price Change', width / 2, height - 5);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Impermanent Loss %', 0, 0);
    ctx.restore();

    // Draw legend
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    
    // Current price
    ctx.fillStyle = 'oklch(0.7 0.25 280)';
    ctx.fillRect(padding.left, padding.top - 25, 15, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Current Price', padding.left + 20, padding.top - 20);
    
    // Your range
    ctx.fillStyle = 'oklch(0.7 0.25 280 / 0.3)';
    ctx.fillRect(padding.left + 120, padding.top - 25, 15, 15);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Your Range', padding.left + 140, padding.top - 13);

    // IL Curve
    ctx.strokeStyle = 'oklch(0.704 0.191 22.216)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding.left + 230, padding.top - 22);
    ctx.lineTo(padding.left + 245, padding.top - 22);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('IL Curve', padding.left + 250, padding.top - 17);

    // Draw result indicators if available
    if (result) {
      // Show expected IL point
      const ilAtBounds = Math.max(
        Math.abs(generateILCurve(currentPrice, 1).find(p => Math.abs(p.price - lowerBound) < currentPrice * 0.1)?.il || 0),
        Math.abs(generateILCurve(currentPrice, 1).find(p => Math.abs(p.price - upperBound) < currentPrice * 0.1)?.il || 0)
      );
      
      if (ilAtBounds > 0) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.arc(lowerX, yScale(ilAtBounds), 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(upperX, yScale(ilAtBounds), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  }, [currentPrice, lowerBound, upperBound, result]);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Impermanent Loss Curve</h3>
        <p className="text-sm text-muted-foreground">
          Interactive visualization of IL across different price movements
        </p>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-[400px] rounded-lg bg-muted/30"
        style={{ width: '100%', height: '400px' }}
      />
    </Card>
  );
}