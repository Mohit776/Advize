'use client';

import React, { useState } from 'react';
import { Plus, Upload, Tag, IndianRupee, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function AddProductPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [offerType, setOfferType] = useState<'percent' | 'fixed'>('percent');
  const [offerValue, setOfferValue] = useState('');

  const [commissionType, setCommissionType] = useState<'percent' | 'fixed'>('percent');
  const [commissionValue, setCommissionValue] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const originalPriceNum = parseFloat(price) || 0;
  const offerValueNum = parseFloat(offerValue) || 0;
  const commissionValueNum = parseFloat(commissionValue) || 0;

  let offerApplied = 0;
  if (offerType === 'fixed') {
    offerApplied = offerValueNum;
  } else if (offerType === 'percent') {
    offerApplied = originalPriceNum * (offerValueNum / 100);
  }

  const finalPriceNum = Math.max(0, originalPriceNum - offerApplied);

  let creatorEarningsNum = 0;
  if (commissionType === 'fixed') {
    creatorEarningsNum = commissionValueNum;
  } else if (commissionType === 'percent') {
    creatorEarningsNum = finalPriceNum * (commissionValueNum / 100);
  }

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Product name is required';
    if (!price.trim() || isNaN(originalPriceNum) || originalPriceNum <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!whatsapp.trim()) newErrors.whatsapp = 'WhatsApp number is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const productData = {
      name,
      description,
      price: originalPriceNum,
      whatsapp,
      offer: {
        type: offerType,
        value: offerValueNum,
      },
      commission: {
        type: commissionType,
        value: commissionValueNum,
      },
      calculated: {
        finalPrice: finalPriceNum,
        creatorEarning: creatorEarningsNum,
      }
    };

    console.log('--- Submitting Product Info ---');
    console.log(productData);
    alert('Product details logged to console!');
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/business/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline text-foreground">
              Add Product
            </h2>
            <p className="text-muted-foreground mt-1">Create a product for affiliate promotion</p>
          </div>
        </div>
        <Button size="lg" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors" onClick={handleSubmit}>
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Premium Noise Cancelling Headphones"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background focus-visible:ring-primary/50 transition-shadow"
                />
                {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  placeholder="Briefly describe the product's features, contents, or what makes it great..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background focus-visible:ring-primary/50 transition-shadow min-h-[100px] resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      placeholder="0.00"
                      className="pl-9 bg-background focus-visible:ring-primary/50 transition-shadow"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Brand WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    placeholder="+91 98765 43210"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="bg-background focus-visible:ring-primary/50 transition-shadow"
                  />
                  {errors.whatsapp && <p className="text-red-400 text-sm mt-1">{errors.whatsapp}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Image */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Product Image</CardTitle>
              <CardDescription>Upload a high-quality image of your product.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex gap-2 items-center text-sm font-medium">
                  <Upload className="h-4 w-4" /> Click to upload image
                </div>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG or WEBP (Max 5MB)</p>
              </div>
            </CardContent>
          </Card>

          {/* Offer for Buyers */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Offer for Buyers</CardTitle>
              <CardDescription>Set the discount that buyers will receive when purchasing through a creator''s link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex bg-muted/50 p-1 rounded-lg w-fit mb-4 border border-border/50">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${offerType === 'percent' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setOfferType('percent')}
                >
                  % OFF
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${offerType === 'fixed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setOfferType('fixed')}
                >
                  ₹ OFF
                </button>
              </div>

              <div className="space-y-2 max-w-sm">
                <Label htmlFor="offerValue">Offer Value</Label>
                <div className="relative">
                  {offerType === 'fixed' && <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                  {offerType === 'percent' && <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                  <Input
                    id="offerValue"
                    type="number"
                    min="0"
                    placeholder={offerType === 'percent' ? 'e.g. 15' : 'e.g. 200'}
                    className="pl-9 bg-background focus-visible:ring-primary/50 transition-shadow"
                    value={offerValue}
                    onChange={(e) => setOfferValue(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creator Commission */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Creator Commission</CardTitle>
              <CardDescription>How much the creator will earn per successful affiliate sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex bg-muted/50 p-1 rounded-lg w-fit mb-4 border border-border/50">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${commissionType === 'percent' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCommissionType('percent')}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${commissionType === 'fixed' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setCommissionType('fixed')}
                >
                  Fixed ₹
                </button>
              </div>

              <div className="space-y-2 max-w-sm">
                <Label htmlFor="commissionValue">Commission Value</Label>
                <div className="relative">
                  {commissionType === 'fixed' && <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                  {commissionType === 'percent' && <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                  <Input
                    id="commissionValue"
                    type="number"
                    min="0"
                    placeholder={commissionType === 'percent' ? 'e.g. 10' : 'e.g. 150'}
                    className="pl-9 bg-background focus-visible:ring-primary/50 transition-shadow"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Live Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.05)] bg-card overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary"></div>
              <CardHeader className="bg-muted/10 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-4 w-4 text-primary" /> Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">

                {/* Price Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Original Price</span>
                    <span className="font-medium text-foreground">₹{originalPriceNum.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-400">Offer Applied</span>
                    <span className="font-medium text-green-400">-₹{offerApplied.toFixed(2)}</span>
                  </div>

                  <div className="h-px w-full bg-border/60 my-2"></div>

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Final Price</span>
                    <span className="font-bold text-xl text-primary">₹{finalPriceNum.toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                  <div className="relative z-10">
                    <p className="text-xs text-primary/80 font-medium uppercase tracking-wider mb-1">Creator Earnings</p>
                    <p className="text-lg font-bold text-primary">₹{creatorEarningsNum.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">per sale</span></p>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Mobile Action Button - Only visible on small screens */}
            <div className="mt-6 lg:hidden">
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-colors" onClick={handleSubmit}>
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper icon
function Eye(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
