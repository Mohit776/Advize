'use client';

import React from 'react';
import { Search, Link as LinkIcon, Sparkles } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const mockProducts = [
  {
    id: 1,
    title: "GlowUp Vitamin C Serum",
    category: "Beauty & Skincare",
    commission: "15%",
    description: "Brightening serum with 20% Vitamin C for radiant, youthful skin. Perfect for daily skincare routines.",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 2,
    title: "SoundPods Pro X",
    category: "Tech & Gadgets",
    commission: "₹250 per sale",
    description: "Premium wireless earbuds with ANC, 36hr battery life, and crystal-clear audio quality.",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 3,
    title: "FitFuel Whey Protein",
    category: "Health & Fitness",
    commission: "12%",
    description: "Premium whey protein isolate, 25g protein per scoop, zero sugar, great taste.",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 4,
    title: "Air Max Sneakers",
    category: "Fashion",
    commission: "₹300 per sale",
    description: "Iconic streetwear sneakers with signature air bubble cushioning and durable leather upper.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 5,
    title: "Artisan Premium Coffee",
    category: "Food & Beverage",
    commission: "10%",
    description: "100% Arabica beans, medium roast. Ethically sourced and roasted in small batches.",
    image: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&q=80&w=400"
  },
  {
    id: 6,
    title: "Velocity Smartwatch",
    category: "Tech & Gadgets",
    commission: "₹500 per sale",
    description: "Advanced fitness tracking, heart rate monitoring, and 7-day battery life.",
    image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=400"
  }
];

export default function AffiliateProgramsPage() {
  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8 max-w-7xl mx-auto w-full">

      {/* Hero Section */}
      <div className="rounded-2xl bg-primary text-primary-foreground p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2 text-primary-foreground/90 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Affiliate Marketplace</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline mb-2 tracking-tight">
            Discover Products. Share Links. Earn Money.
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/90 max-w-xl">
            Browse top brands, generate your unique affiliate link, and start earning commissions.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products or brands..."
            className="pl-9 h-10 bg-card border-border/50 text-sm rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 md:flex gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-full md:w-[140px] h-10 bg-card border-border/50 text-sm rounded-lg">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categories</SelectItem>
              <SelectItem value="beauty">Beauty</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="health">Health</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all_brands">
            <SelectTrigger className="w-full md:w-[140px] h-10 bg-card border-border/50 text-sm rounded-lg">
              <SelectValue placeholder="Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_brands">All Brands</SelectItem>
              <SelectItem value="nike">Nike</SelectItem>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="glowup">GlowUp</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="newest">
            <SelectTrigger className="w-full md:w-[140px] h-10 bg-card border-border/50 text-sm rounded-lg">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Recent First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="any_comm">
            <SelectTrigger className="w-full md:w-[160px] h-10 bg-card border-border/50 text-sm rounded-lg">
              <SelectValue placeholder="Commission" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any_comm">Any Commission</SelectItem>
              <SelectItem value="high_percent">Highest %</SelectItem>
              <SelectItem value="high_fixed">Highest ₹</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden flex flex-col group border-border/50 hover:border-primary/30 transition-colors shadow-sm hover:shadow-md bg-card">

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
            </div>

            {/* Content Container */}
            <CardContent className="p-5 flex-1 flex flex-col pt-4">
              <div className="mb-3">
                <span className="inline-flex px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                  {product.category}
                </span>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">{product.title}</h3>

              <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
                {product.description}
              </p>

              <div className="mt-auto pt-2">
                <Button className="w-full justify-center bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors duration-200">
                  <LinkIcon className="h-4 w-4 mr-2" /> Generate Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
