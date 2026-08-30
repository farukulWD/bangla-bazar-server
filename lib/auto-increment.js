const mongoose = require("mongoose");

// Counter documents written by the former `mongoose-sequence` plugin.
// Shape and collection name are kept identical so existing sequences continue
// from where they left off instead of restarting.
const counterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    reference_value: { type: mongoose.Schema.Types.Mixed, default: null },
    seq: { type: Number, required: true },
  },
  {
    collection: "counters",
    validateBeforeSave: false,
    versionKey: false,
    _id: false,
  }
);

counterSchema.index({ id: 1, reference_value: 1 }, { unique: true });

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

// Atomically reserves and returns the next number for the given sequence id.
// A fresh sequence is seeded at `startSeq - 1` so the first value handed out is
// `startSeq`, matching the old plugin's `start_seq` semantics.
const nextSequence = async (id, startSeq = 1) => {
  try {
    await Counter.updateOne(
      { id, reference_value: null },
      { $setOnInsert: { seq: startSeq - 1 } },
      { upsert: true }
    );
  } catch (err) {
    // A concurrent request seeded it first; the unique index rejected ours.
    if (err.code !== 11000) throw err;
  }

  const counter = await Counter.findOneAndUpdate(
    { id, reference_value: null },
    { $inc: { seq: 1 } },
    { returnDocument: "after" }
  );

  return counter.seq;
};

module.exports = { Counter, nextSequence };
