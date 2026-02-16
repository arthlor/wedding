# **Architectural Blueprint for a Zero-Cost, High-Concurrency Wedding Media Aggregation System**

## **1\. Executive Summary**

The digital capture of nuptial events has evolved from the era of disposable cameras to a distributed, guest-driven model. This report presents an exhaustive technical analysis and implementation plan for constructing a wedding photo aggregation system utilizing **Supabase** (Backend-as-a-Service) and **Netlify** (Frontend-as-a-Service).

Unlike the previous iteration, this revised architecture implements a **"Gatekeeper" moderation model** and a **Strict Quota System**. To ensure quality and prevent abuse, each guest (identified via persistent anonymous session) is strictly limited to **10 uploads**. Furthermore, no uploaded image is publicly viewable until explicitly approved by an administrator. This ensures the couple maintains absolute control over the digital narrative while leveraging the free tier infrastructure of Supabase (1GB Storage) and Netlify (100GB Bandwidth).

## **2\. Infrastructure Analysis and Resource Constraints**

To successfully navigate the "free tier" landscape, one must first deconstruct the precise limits imposed by cloud providers.

### **2.1 The Supabase Free Tier Ecology (2025-2026)**

Supabase, built upon PostgreSQL, offers a compelling free tier. However, the 10-photo limit per user drastically changes the capacity planning.

#### **2.1.1 Storage and Quota Management**

* **Storage Limit (1 GB)**: With the new constraint of 10 photos per guest and \~150 guests, the total potential upload volume is 1,500 images.  
* **Compression Strategy**: Using client-side compression to target \~300 KB per image 1, the total storage footprint would be approx 450 MB (![][image1]). This fits comfortably within the 1 GB limit with 50% headroom, removing the risk of hitting storage caps mid-event.

#### **2.1.2 Database and Bandwidth**

* **Egress (5 GB/month)**: Supabase charges for data leaving their platform. By routing read traffic through Netlify, we bypass this.  
* **Project Dormancy**: Supabase pauses projects after one week of inactivity. The system requires a "warm-up" protocol (scheduled cron job) 24 hours prior to the ceremony.

### **2.2 The Netlify Edge Advantage**

Netlify serves as the caching proxy layer.

* **Bandwidth (100 GB/month)**: Netlify's generous bandwidth allows for high-resolution viewing.  
* **Image CDN**: Netlify’s Image CDN will transform images on the fly, fetching them from Supabase once and serving cached copies to all subsequent users.2

## **3\. System Architecture and Data Flow**

### **3.1 Ingress (The Upload Path)**

1. **Session Check**: Client checks for an existing uploader\_session\_id. If none, it anonymously signs in.  
2. **Quota Verification**: Client queries the database for count(\*) of photos owned by this session. If count \>= 10, the upload UI is disabled.  
3. **Compression**: Client compresses image to WebP (max 1920px, \~300KB).  
4. **Upload**: Authenticated upload to Supabase Storage.  
5. **Metadata Insert**: A row is inserted into the photos table with is\_approved \= FALSE.

### **3.2 Egress (The Viewing Path)**

1. **Filtered Query**: The gallery component queries the database for rows where is\_approved \= TRUE.  
2. **Proxy Delivery**: Images are loaded via Netlify Image CDN (e.g., /.netlify/images?url=...).

### **3.3 Security Model: Row Level Security (RLS)**

Security is enforced at the database kernel level using PostgreSQL RLS.

* **Public Read**: Allowed ONLY for rows where is\_approved \= TRUE.  
* **Private Read**: The Uploader can see their own photos (even if unapproved) to confirm upload success.  
* **Strict Write**: INSERT is allowed only if the user has uploaded fewer than 10 images. This is enforced via a Database Trigger (more robust than RLS for aggregates).

## **4\. Database Schema and Storage Engineering**

### **4.1 PostgreSQL Schema Design**

The public schema contains the primary photos table.

**Table Definition: photos**

SQL

CREATE TABLE public.photos (  
    id UUID NOT NULL DEFAULT gen\_random\_uuid() PRIMARY KEY,  
    storage\_path TEXT NOT NULL,  
    uploader\_session\_id UUID DEFAULT auth.uid(),  
    caption TEXT CHECK (char\_length(caption) \< 280),  
    created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  
    is\_approved BOOLEAN DEFAULT FALSE, \-- Gatekeeper Default  
    metadata JSONB DEFAULT '{}'::jsonb  
);

\-- Index for fast sorting and filtering by approval status  
CREATE INDEX idx\_photos\_approved\_created ON public.photos (is\_approved, created\_at DESC);  
\-- Index for counting user uploads efficiently  
CREATE INDEX idx\_photos\_uploader ON public.photos (uploader\_session\_id);

### **4.2 Enforcing the 10-Photo Limit (Server-Side)**

We cannot rely solely on the frontend to disable the button. We must enforce this in the database to prevent API abuse. We use a **Trigger** because RLS policies involving aggregates (count) can be performance-heavy or cause recursion issues.

SQL

\-- 1\. Create the limit check function  
CREATE OR REPLACE FUNCTION check\_upload\_limit()  
RETURNS TRIGGER AS $$  
BEGIN  
  IF (  
    SELECT count(\*)  
    FROM public.photos  
    WHERE uploader\_session\_id \= auth.uid()  
  ) \>= 10 THEN  
    RAISE EXCEPTION 'Upload limit reached. You can only upload 10 photos.';  
  END IF;  
  RETURN NEW;  
END;  
$$ LANGUAGE plpgsql SECURITY DEFINER;

\-- 2\. Attach trigger to table  
CREATE TRIGGER enforce\_10\_photo\_limit  
BEFORE INSERT ON public.photos  
FOR EACH ROW EXECUTE FUNCTION check\_upload\_limit();

### **4.3 Security Policies (RLS)**

**Policy 1: Public Gallery View**

Guests can only see photos that have been approved.

SQL

CREATE POLICY "Public View Approved"  
ON public.photos FOR SELECT  
USING ( is\_approved \= true );

**Policy 2: Uploader Own View**

Guests can see their own photos (even pending ones) to know they uploaded successfully.

SQL

CREATE POLICY "Uploader View Own"  
ON public.photos FOR SELECT  
USING ( uploader\_session\_id \= auth.uid() );

**Policy 3: Guest Uploads**

Guests can insert rows (The Trigger above handles the limit).

SQL

CREATE POLICY "Guest Insert"  
ON public.photos FOR INSERT  
TO authenticated  
WITH CHECK ( uploader\_session\_id \= auth.uid() );

**Policy 4: Admin Full Access**

The couple (Admin) needs full access to approve/reject.

SQL

CREATE POLICY "Admin Full Access"  
ON public.photos FOR ALL  
USING ( auth.uid() \= 'd83e206a-5432-...' ); \-- Admin UUID

## **5\. Client-Side Engineering: UI & Logic**

### **5.1 Upload UI with Quota Tracking**

The UI must actively communicate the limit to the user.

**Logic Flow**:

1. **On Mount**: Fetch current usage count.  
   JavaScript  
   const { count } \= await supabase  
    .from('photos')  
    .select('\*', { count: 'exact', head: true }) // efficient count query  
    .eq('uploader\_session\_id', session.user.id);  
   setUploadCount(count);

2. **Visual Indicator**: Display a progress bar or text: "You have uploaded 3/10 photos."  
3. **Conditional Rendering**:  
   JavaScript  
   {uploadCount \>= 10? (  
     \<div className\="text-red-500"\>Maximum limit reached. Thank you\!\</div\>  
   ) : (  
     \<button onClick\={handleUpload}\>Upload Photo ({10 \- uploadCount} left)\</button\>  
   )}

### **5.2 The Admin "Review" Dashboard**

The couple needs a secret route (e.g., /admin/moderation) to approve photos.

**Admin Query**:

JavaScript

// Fetch pending photos  
const { data } \= await supabase  
 .from('photos')  
 .select('\*')  
 .eq('is\_approved', false)  
 .order('created\_at', { ascending: false });

**Approval Action**:

JavaScript

const approvePhoto \= async (photoId) \=\> {  
  await supabase  
   .from('photos')  
   .update({ is\_approved: true })  
   .eq('id', photoId);  
  // Remove from local state to update UI instantly  
};

## **6\. Frontend Implementation: React & Netlify**

### **6.1 Netlify Configuration (netlify.toml)**

This configuration ensures images are proxied correctly.

Ini, TOML

\[build\]  
  command \= "npm run build"  
  publish \= "dist"

\[images\]  
  remote\_images \= \["https://\*.supabase.co/storage/v1/object/public/wedding\_photos/\*"\]

\[\[redirects\]\]  
  from \= "/\*"  
  to \= "/index.html"  
  status \= 200

### **6.2 Authentication (Anonymous)**

We use anonymous authentication to track the user's UUID for the 10-photo limit without requiring them to sign up with email.

JavaScript

// App.jsx  
useEffect(() \=\> {  
  supabase.auth.getSession().then(({ data: { session } }) \=\> {  
    if (\!session) {  
      supabase.auth.signInAnonymously();  
    }  
  });  
},);

## **7\. QR Code Strategy**

Use **Static QR Codes** pointing to https://your-wedding.netlify.app.

* **Reason**: Static codes never expire and have no scan limits.  
* **Printing**: Print these on table cards with the instruction: *"Scan to share your best shots\! (Limit 10 per guest)"*.

## **8\. Moderation Workflow Summary**

1. **Guest Upload**: Guest uploads IMG\_001.jpg.  
2. **Status**: Database stores it with is\_approved: false.  
3. **Public Gallery**: Other guests checking the site **do not** see the image yet.  
4. **Admin Check**: The couple (or a designated trusted friend) logs into the /admin page on their phone.  
5. **Approval**: They see IMG\_001.jpg in the "Pending" queue and tap "Approve".  
6. **Live**: The database updates to is\_approved: true. The image now appears in the public gallery for all guests.

## **9\. Step-by-Step Implementation Guide**

### **Phase 1: Supabase Setup**

1. **Create Project**: Initialize new project.  
2. **SQL Setup**: Run the Schema creation script (Section 4.1) and the Trigger script (Section 4.2).  
3. **Storage**: Create wedding\_photos bucket (Public).  
4. **Auth**: Enable "Anonymous Sign-in".  
5. **RLS**: Apply policies from Section 4.3.

### **Phase 2: Frontend Logic**

1. **Scaffold**: npm create vite@latest wedding \-- \--template react.  
2. **State Management**: Create a useUploadLimit hook that fetches the user's current count on load.  
3. **Upload Component**: Implement browser-image-compression and the UI logic to disable the button when count \>= 10\.  
4. **Admin Page**: Create a secured route (protected by a simple PIN or Supabase email login) to list and toggle is\_approved.

### **Phase 3: Deployment**

1. **Netlify**: Connect GitHub repo. Add environment variables.  
2. **Testing**:  
   * Open Incognito window (Guest 1). Upload 10 photos. Verify 11th fails.  
   * Open another window (Admin). Approve 5 photos.  
   * Refresh Guest 1\. Verify only 5 photos are visible in the main gallery.

## **10\. Conclusion**

This revised architecture adds a necessary layer of control to the wedding photo app. By enforcing a **hard cap of 10 photos** via Database Triggers and implementing a **"Gatekeeper" approval system** via Row Level Security, the system prevents spam, ensures quality, and keeps storage costs predictable. The combination of Supabase for strict logic enforcement and Netlify for free bandwidth proxying remains the optimal zero-cost tech stack for this use case.

#### **Alıntılanan çalışmalar**

1. How to reduce Image file size. \- Supabase \- Reddit, erişim tarihi Şubat 16, 2026, [https://www.reddit.com/r/Supabase/comments/18g89xs/how\_to\_reduce\_image\_file\_size/](https://www.reddit.com/r/Supabase/comments/18g89xs/how_to_reduce_image_file_size/)  
2. A few questions about Netlify Image CDN, erişim tarihi Şubat 16, 2026, [https://answers.netlify.com/t/a-few-questions-about-netlify-image-cdn/106714](https://answers.netlify.com/t/a-few-questions-about-netlify-image-cdn/106714)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAAAXCAYAAADKtudKAAAEQ0lEQVR4Xu2YTahNURTH1wtFPkOh6D1DH5nIwMSEwkAZKGSiDFBGDGSiZ4QykigpYUCIDEQSNybKRCIl8kgJSYRCPvb/7b3uWed/99733nffe8U7v1p1zn/tfc7a+6yzv0QqKioqKioqKir+Bw44O25sedndwDIpl0f9KaSxHXXWIxkmOFvr7KazP85elt1tgfpsk0slRI4FfVy4f+/sVeGuA31JuEZZ1BlTuIeNH87uh+up4uPYUbiToN1XnHWF+30S748Yu52dFl9e68d4IkU/x4B+ikXHLfG+bnaA1eIzZ4EMbkKgI5k54n0LjYYGQ9tmNHQINxJ1HpE21JyQxjhWBU0TOkWfs4+kod5r0mKg/WvEl99KPstSGVhCAPh+s8h0mhBoRI6axIP/KuXgUAYaA30si0NIrD8wokI/TDrzWXy58UbLfTyLTYjv5FOQDCD3zFxCoH9T9erEOqAdmiVEKni8U/WJ4ToWB/QVLBKXne1i0bDZ2Q0WE+B9NRbF6x9YJDCCLCYN9e6RFkMTok98nRklrwfTBUj1KcglBHypZKuT+hCtsl78VKFBbiy7k8HbhMC6AdePC3edXAMtOtcz0GaymAHlr7Io6XbkwPRxjcUEmhA6GvHUg+lT1zG5WGL9tSjoqTolUKiThODA8TysT+x9LBCbEDpU1uregpQeA4s3rAGUPeITpR1iHQpS7WBmSVH2HflyaEIArDlQf3rh7h9lRofrXCzQ8YNi0a6G+y/SfDTvp9OEGEX3Oo8i00Eq+KFICHDB2Rlnh8Tvotql04SwdIuvM5sdEWxC6CL2bLjvkmK6ALlYUvHjZ4EPO74sKNRJQjB3xT9TV8qp4GNThm71LKkG5njo7BmLLYL3XWRR0u1ohtbTvzuFTQhg34e+tGuTXCy5/uoV79fFaRQUGGhC7He2nbSalINKBW8TQofZWBzQd7KYYTBGiBqLkm6HBX8yo/U2sYPghMDooO/7ZnSQi8X2PTNP0u2rk/oQrYC6OEyyvAm6ZuH1cM9/CLacdtuJ65/mHmC7ibqtbjuRAPYgC9PZHXPfCngf2mDBXA49t+3UaS+2poI12ylxQgDUuy2Nf/RAE6JXvH8L6SVyCYFtVuxjKrHtFMrbrQ22T9Bso/QU0h5MYQXNjcRc2urBFE7ielkUvx2NTUUpjkhjHBqbPZjij6LtxKGfhculOCiNp6H6MzG5Z0KPJQTWMfBxwvaD+UgfymZ5GzRupIIh8pMUR7N7xZfn42YsZKBPEl8HByRPSyU8GG1WhmvdRvKiNcZgnkMArMqfh+se8XFge22J9RfaeUmK9uMYG2VyR9c6dVrTBflcZyfDNYiVhWZ3Ns2sYzDU8VBmmebsgfiXxRZjCoJGuRfO5pPPck78szD62BO/4Wad+G0j/lJO8BzoK2z1fkm+P/5ZsCeOLZYqRijnWagYuWxgoaKioqJipPAXFNCDTYu3IRgAAAAASUVORK5CYII=>