import { Webhook } from "svix";
import User from "../models/User.js";

export const ClerkWebhook = async (req, res) => {
  try {
  
    // headers from Clerk
    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    // verify signature
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const evt = await whook.verify(req.body, headers);

    const { data, type } = evt;

    switch (type) {
      case "user.created": {
        const email =
          data.email_addresses[0]?.email_address ||
          null;

        const first =
          data.first_name  || "";
        const last =
          data.last_name || "";
        const name = `${first} ${last}`.trim() ;

        await User.create({
          _id: data.id,
          email,
          name,
          image: data.image_url,
        });

        break;
      }

      case "user.updated": {
        const updated = {
          email: data.email_addresses[0]?.email_address || null,
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim(),
            
          image: data.image_url,
        };
        await User.findByIdAndUpdate(data.id, updated);
        break;
      }

      case "user.deleted": {
        await User.findByIdAndDelete(data.id);
        break;
      }

      default:
        break;
    }
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error.message);
    res.status(400).json({ success: false, message: "Webhook Error" });
  }
};
