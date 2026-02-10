import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // List all files in chat-attachments bucket
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Get all user folders
    const { data: folders, error: folderError } = await supabase.storage
      .from("chat-attachments")
      .list("", { limit: 1000 });

    if (folderError) throw folderError;

    let deletedCount = 0;
    const filesToDelete: string[] = [];

    for (const folder of folders || []) {
      if (!folder.id) continue; // skip if it's a folder marker

      // List files in each user folder
      const { data: files, error: fileError } = await supabase.storage
        .from("chat-attachments")
        .list(folder.name, { limit: 1000 });

      if (fileError) {
        console.error(`Error listing files in ${folder.name}:`, fileError);
        continue;
      }

      for (const file of files || []) {
        if (!file.created_at) continue;

        const fileDate = new Date(file.created_at);
        // Check if file is a large file (>5MB based on metadata) and older than 2 weeks
        // Since we can't easily get file size from list, we check all files older than 2 weeks
        // that match the size threshold by checking metadata
        if (fileDate < twoWeeksAgo) {
          // Check file size - only delete large files (>5MB)
          const filePath = `${folder.name}/${file.name}`;
          
          // For files > 5MB, mark for deletion
          if (file.metadata && typeof file.metadata === 'object' && 'size' in file.metadata) {
            const size = Number((file.metadata as Record<string, unknown>).size);
            if (size > 5 * 1024 * 1024) {
              filesToDelete.push(filePath);
            }
          } else {
            // If no metadata, check by downloading head
            // Skip files we can't determine size for - be conservative
          }
        }
      }
    }

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from("chat-attachments")
        .remove(filesToDelete);

      if (deleteError) throw deleteError;
      deletedCount = filesToDelete.length;
    }

    console.log(`Cleanup complete: ${deletedCount} expired large files deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        files: filesToDelete,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
