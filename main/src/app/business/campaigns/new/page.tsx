
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Trash2, Calendar as CalendarIcon, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, addDocumentNonBlocking, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const campaignFormSchema = z.object({
  name: z.string().min(5, 'Campaign name must be at least 5 characters.'),
  visibility: z.enum(['public', 'private']),
  type: z.string({ required_error: 'Please select a campaign type.' }),
  description: z.string().min(20, "Description must be at least 20 characters."),
  budget: z.coerce.number().optional(),
  cpmRate: z.coerce.number().optional(),
  maxPayPerCreator: z.coerce.number().optional(),
  fixedPayPerCreator: z.coerce.number().optional(),
  numberOfCreators: z.coerce.number().optional(),
  minFollowers: z.coerce.number().optional(),
  maxFollowers: z.coerce.number().optional(),
  startDate: z.date({ required_error: "A start date is required." }),
  endDate: z.date({ required_error: "An end date is required." }),
  platforms: z.array(z.string()).min(1, "You must select at least one platform."),
  requirements: z.string().min(20, 'Requirements must be at least 20 characters.'),
  dos: z.string().optional(),
  donts: z.string().optional(),
  tryItems: z.array(
    z.object({
      name: z.string().min(2, { message: 'Item name must be at least 2 characters.' }),
    })
  ).optional(),
  demoContent: z.array(
    z.object({
      link: z.string().url({ message: 'Please enter a valid URL.' }),
      description: z.string().min(3, { message: 'Description must be at least 3 characters.' }),
    })
  ).optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date.",
  path: ["endDate"],
}).refine((data) => {
  if (data.visibility === 'public') {
    return data.budget && data.budget > 0 && data.cpmRate && data.cpmRate > 0;
  }
  return true;
}, { message: "Budget and CPM Rate are required for public campaigns.", path: ["budget"] })
  .refine((data) => {
    if (data.visibility === 'private') {
      return data.fixedPayPerCreator && data.fixedPayPerCreator > 0 && data.numberOfCreators && data.numberOfCreators > 0;
    }
    return true;
  }, { message: "Fixed Pay and Number of Creators are required for private campaigns.", path: ["fixedPayPerCreator"] });

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

const campaignTypes = ["UGC", "Short Video", "Reaction Video", "Review", "Unboxing Video", "Demo Video", "Tutorial", "Haul Video", "Banner/Image Post", "Clipping", "Giveaway", "Barter Collab"];
const availablePlatforms = ["Instagram", "YouTube", "LinkedIn", "Facebook", "Snapchat", "ShareChat"];


export default function NewCampaignPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: userData } = useDoc<any>(userRef);


  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      visibility: 'public',
      description: '',
      platforms: [],
      requirements: '',
      dos: '',
      donts: '',
      demoContent: [],
      tryItems: [],
    },
    mode: 'onChange',
  });

  const { fields: demoFields, append: appendDemo, remove: removeDemo } = useFieldArray({
    control: form.control,
    name: 'demoContent',
  });

  const { fields: tryItemFields, append: appendTryItem, remove: removeTryItem } = useFieldArray({
    control: form.control,
    name: 'tryItems',
  });

  const campaignType = form.watch('type');
  const campaignVisibility = form.watch('visibility');

  async function onSubmit(data: CampaignFormValues) {
    if (!user || !userData || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to create a campaign." });
      return;
    }

    // 1. Create the campaign document
    const campaignsColRef = collection(firestore, 'campaigns');
    const newCampaignRef = doc(campaignsColRef); // Create a reference with a new ID
    const campaignId = newCampaignRef.id;

    const finalCampaignData = {
      id: campaignId,
      name: data.name,
      description: data.description,
      platforms: data.platforms,
      requirements: data.requirements,
      dos: data.dos,
      donts: data.donts,
      demoContent: data.demoContent,
      // Top-level fields
      visibility: data.visibility,
      type: data.type,
      // Optional fields converted to null if undefined
      budget: data.budget ?? null,
      cpmRate: data.cpmRate ?? null,
      maxPayPerCreator: data.maxPayPerCreator ?? null,
      fixedPayPerCreator: data.fixedPayPerCreator ?? null,
      numberOfCreators: data.numberOfCreators ?? null,
      minFollowers: data.minFollowers ?? null,
      maxFollowers: data.maxFollowers ?? null,
      tryItems: data.tryItems?.map(item => item.name) || [],
      // Dates as Timestamps
      startDate: data.startDate,
      endDate: data.endDate,
      // Denormalized and server data
      businessId: user.uid,
      brandName: userData.name,
      brandLogo: userData.logoUrl || null,
      creatorIds: [],
      status: 'Active',
    };


    // Set the campaign document with the new ID
    await setDocumentNonBlocking(newCampaignRef, finalCampaignData, {});

    // 2. Create the corresponding group document
    const groupRef = doc(firestore, 'groups', campaignId); // Use campaignId as groupId
    const groupData = {
      id: campaignId,
      campaignId: campaignId,
      name: data.name,
      adminId: user.uid,
      memberIds: [], // Initially empty
      createdAt: serverTimestamp(),
    };
    await setDocumentNonBlocking(groupRef, groupData, {});


    toast({
      title: 'Campaign Created!',
      description: `Your new campaign "${data.name}" is now live.`,
    });
    router.push('/business/profile');
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/business/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-headline">Create New Campaign</h1>
            <p className="text-muted-foreground">Fill out the details to launch your next campaign.</p>
          </div>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Provide the core information for your campaign.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Visibility</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select campaign visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public Campaign</SelectItem>
                        <SelectItem value="private">Private Campaign</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'public'
                        ? 'Visible to all creators on the platform. Based on budget and CPM.'
                        : 'Invite-only or for specific creators. Based on a fixed pay.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Summer UGC Campaign" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campaign type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {campaignTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief, high-level overview of what this campaign is about."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platforms"
                render={() => (
                  <FormItem>
                    <FormLabel>Platforms</FormLabel>
                    <FormDescription>Select the platforms for this campaign.</FormDescription>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                      {availablePlatforms.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="platforms"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(
                                          (field.value || [])?.filter(
                                            (value) => value !== item
                                          )
                                        )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {campaignType === 'Barter Collab' && (
            <Card>
              <CardHeader>
                <CardTitle>Barter Items</CardTitle>
                <CardDescription>List the products or items you will provide for the barter collaboration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tryItemFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`tryItems.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder={`e.g., T-shirt, Headphones`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTryItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendTryItem({ name: '' })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline & Budget</CardTitle>
              <CardDescription>Define the financial and time constraints of your campaign.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < (form.getValues("startDate") || new Date())
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {campaignVisibility === 'public' ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Budget (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpmRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPM Rate (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1500" {...field} />
                          </FormControl>
                          <FormDescription>Cost per 1,000 views.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="maxPayPerCreator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Pay Per Creator (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000" {...field} />
                        </FormControl>
                        <FormDescription>The most any single creator can earn from this campaign, regardless of views.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fixedPayPerCreator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fixed Pay Per Creator (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numberOfCreators"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Creators</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Card className="bg-muted/50 border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">Creator Requirements</CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minFollowers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Followers</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="10000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxFollowers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Followers</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="500000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Requirements & References</CardTitle>
              <CardDescription>Let creators know what you're looking for and provide examples.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brief & Requirements</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the campaign goal, content format, required tags, and any other key requirements."
                        className="resize-y min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Do's</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g.,&#10;- Show the product in natural light&#10;- Mention the free shipping offer"
                          className="resize-y min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>One point per line.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="donts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Don'ts</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g.,&#10;- Don't use filters&#10;- Don't mention competitors"
                          className="resize-y min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>One point per line.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormLabel>Demo Content</FormLabel>
                <FormDescription>Provide links to reference posts, videos, or documents.</FormDescription>
                <div className="space-y-4 mt-2">
                  {demoFields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg relative">
                      <div className="grid gap-4 flex-1">
                        <FormField
                          control={form.control}
                          name={`demoContent.${index}.link`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Link URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://www.instagram.com/p/..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`demoContent.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Example of good lighting" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeDemo(index)}
                        className="mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendDemo({ link: '', description: '' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Demo Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/business/dashboard">Cancel</Link>
            </Button>
            <Button type="submit">Launch Campaign</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
