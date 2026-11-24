import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Shared by the Next.js server and the separate AdminJS process.
const announcementSchema = new Schema({
  title: {type:String, required:true, trim:true, maxlength:120},
  message: {type:String, required:true, trim:true, maxlength:3000},
  published: {type:Boolean, default:false},
}, {timestamps:true, collection:"announcements"});
announcementSchema.index({published:1, createdAt:-1});

const querySchema = new Schema({
  userId:{type:Schema.Types.ObjectId, required:true},
  name:{type:String, required:true}, email:{type:String, required:true}, phone:{type:String, required:true},
  subject:{type:String, required:true, trim:true, maxlength:120},
  message:{type:String, required:true, trim:true, maxlength:2000},
  reply:{type:String, trim:true, maxlength:4000}, repliedAt:Date,
}, {timestamps:true, collection:"member_queries"});
querySchema.index({userId:1, createdAt:-1});

export const Announcement: Model<InferSchemaType<typeof announcementSchema>> =
  mongoose.models.Announcement ?? mongoose.model("Announcement", announcementSchema);
export const MemberQuery: Model<InferSchemaType<typeof querySchema>> =
  mongoose.models.MemberQuery ?? mongoose.model("MemberQuery", querySchema);


// Events and registrations are shared with AdminJS. Seats are counted on the event so a
// capacity check and the registration write commit in the same transaction.
export const eventSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const eventSchema = new Schema({
  slug:{type:String, required:true, trim:true, lowercase:true, maxlength:80, match:eventSlug},
  name:{type:String, required:true, trim:true, maxlength:120},
  summary:{type:String, required:true, trim:true, maxlength:240},
  description:{type:String, trim:true, maxlength:5000},
  startsAt:Date,
  venue:{type:String, trim:true, maxlength:120},
  capacity:{type:Number, min:1},
  teamSize:{type:Number, min:1, max:6, default:1},
  registeredCount:{type:Number, min:0, default:0},
  registrationStatus:{type:String, enum:["planned","open","closed"], default:"planned"},
  published:{type:Boolean, default:false},
}, {timestamps:true, collection:"events"});
eventSchema.index({slug:1}, {unique:true});
eventSchema.index({published:1, startsAt:1});

const registrationSchema = new Schema({
  event:{type:Schema.Types.ObjectId, ref:"ClubEvent", required:true},
  user:{type:Schema.Types.ObjectId, required:true},
  name:{type:String, required:true}, email:{type:String, required:true}, phone:{type:String, required:true},
  status:{type:String, enum:["registered","cancelled"], default:"registered"},
  details:{
    college:{type:String, trim:true, maxlength:160},
    year:{type:String, trim:true, maxlength:40},
    teamName:{type:String, trim:true, maxlength:80},
    // [{name, email}], validated in src/lib/events.ts. A plain value because the AdminJS adapter
    // cannot render arrays of sub-documents under Mongoose 9.
    teammates:{type:Schema.Types.Mixed},
  },
  registeredAt:{type:Date, default:Date.now},
  cancelledAt:Date,
}, {timestamps:true, collection:"event_registrations"});
registrationSchema.index({event:1, user:1}, {unique:true});
registrationSchema.index({user:1, registeredAt:-1});
registrationSchema.index({event:1, status:1, registeredAt:1});

export const ClubEvent: Model<InferSchemaType<typeof eventSchema>> =
  mongoose.models.ClubEvent ?? mongoose.model("ClubEvent", eventSchema);
export const EventRegistration: Model<InferSchemaType<typeof registrationSchema>> =
  mongoose.models.EventRegistration ?? mongoose.model("EventRegistration", registrationSchema);

// Team and projects are edited in the admin panel. Images are Cloudinary URLs (or a /art/ path for bundled art).
export const imageUrl = /^(?:https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/\S+|\/art\/[a-z0-9-]+\.(?:png|jpe?g|webp))$/i;
const teamSchema = new Schema({
  name:{type:String, required:true, trim:true, maxlength:80},
  role:{type:String, required:true, trim:true, maxlength:80},
  bio:{type:String, trim:true, maxlength:300},
  image:{type:String, trim:true, maxlength:500, match:imageUrl},
  tenure:{type:String, trim:true, maxlength:20},
  order:{type:Number, default:0},
  published:{type:Boolean, default:true},
}, {timestamps:true, collection:"team_members"});
teamSchema.index({published:1, order:1});

const projectSchema = new Schema({
  slug:{type:String, required:true, trim:true, lowercase:true, maxlength:80, match:eventSlug},
  title:{type:String, required:true, trim:true, maxlength:120},
  category:{type:String, trim:true, maxlength:60},
  description:{type:String, required:true, trim:true, maxlength:300},
  detail:{type:String, trim:true, maxlength:5000},
  hardware:{type:String, trim:true, maxlength:300},
  stage:{type:String, trim:true, maxlength:60},
  image:{type:String, trim:true, maxlength:500, match:imageUrl},
  order:{type:Number, default:0},
  published:{type:Boolean, default:true},
}, {timestamps:true, collection:"projects"});
projectSchema.index({slug:1}, {unique:true});
projectSchema.index({published:1, order:1});

export const TeamMember: Model<InferSchemaType<typeof teamSchema>> =
  mongoose.models.TeamMember ?? mongoose.model("TeamMember", teamSchema);
export const Project: Model<InferSchemaType<typeof projectSchema>> =
  mongoose.models.Project ?? mongoose.model("Project", projectSchema);
