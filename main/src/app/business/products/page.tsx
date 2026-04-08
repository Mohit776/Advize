'use client';

import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const mockProducts = [
  {
    id: 1,
    title: "GlowUp Vitamin C Serum",
    category: "Beauty & Skincare",
    commission: "15%",
    status: "Active",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400" 
  },
  {
    id: 2,
    title: "SoundPods Pro X",
    category: "Tech & Gadgets",
    commission: "₹250 per sale",
    status: "Active",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 3,
    title: "FitFuel Whey Protein",
    category: "Health & Fitness",
    commission: "12%",
    status: "Active",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 4,
    title: "Air Max Sneakers",
    category: "Fashion",
    commission: "₹300 per sale",
    status: "Active",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 5,
    title: "Artisan Premium Coffee",
    category: "Food & Beverage",
    commission: "10%",
    status: "Inactive",
    image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 6,
    title: "Velocity Smartwatch",
    category: "Tech & Gadgets",
    commission: "₹500 per sale",
    status: "Active",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=400"
  }
];

export default function ProductsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-foreground">
            My Product listing
          </h2>
          <p className="text-muted-foreground mt-1">Manage your products and affiliate listings</p>
        </div>
        <Button size="lg" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-md hover:shadow-lg" asChild>
          <Link href="/business/add-product">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden flex flex-col group border-border/50 hover:border-primary/30 transition-colors shadow-sm hover:shadow-md">
            
            {/* Image Container */}
            <div className="relative aspect-[4/3] bg-muted/20 w-full overflow-hidden">
                <Image 
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Floating Tags */}
                <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/20 text-primary backdrop-blur-sm shadow-sm ring-1 ring-primary/20">
                        {product.commission}
                    </span>
                </div>

                <div className="absolute top-3 right-3">
                    {product.status === 'Active' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-500 backdrop-blur-sm shadow-sm ring-1 ring-emerald-500/20">
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted/80 text-muted-foreground backdrop-blur-sm shadow-sm ring-1 ring-border">
                            Inactive
                        </span>
                    )}
                </div>
            </div>

            {/* Content Container */}
            <CardContent className="p-5 flex-1 flex flex-col pt-4">
                <div className="mb-3">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                        {product.category}
                    </span>
                </div>
                
                <h3 className="text-lg font-bold text-foreground mb-4 line-clamp-1">{product.title}</h3>

                <div className="mt-auto pt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Button variant="outline" className="w-full justify-center bg-background hover:bg-muted/50 border-border/60">
                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-border/60">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
