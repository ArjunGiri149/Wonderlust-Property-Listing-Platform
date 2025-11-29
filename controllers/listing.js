const Listing = require("../models/listing.js");
const client = require("@maptiler/client");
const { geocoding } = require("@maptiler/client");
const { uploadToCloudinary } = require("../cloudConfig.js"); // our manual uploader
client.config.apiKey = process.env.MAP_TOKEN;

module.exports.search = async (req, res) => {
  const query = req.query.q;
  if (!query) return res.redirect("/listings");

  const regex = new RegExp(query, "i");
  const results = await Listing.find({ location: regex });
  res.render("./listings/searchResults.ejs", { results, query });
};

module.exports.index = async (req, res) => {
  const { category } = req.query;
  let filter = {};
  if (category) filter.category = category;
  const allListings = await Listing.find(filter);
  res.render("listings/index", { allListings, category });
};

module.exports.renderNewForm = (req, res) => {
  res.render("./listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "review", populate: { path: "author" } })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }
  res.render("./listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  try {
    const result = await geocoding.forward(req.body.listing.location, {
      key: process.env.MAP_TOKEN,
      limit: 1,
    });
    const feature = result.features[0];
    const geometry = feature.geometry;

    let image = { url: "", filename: "" };
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, Date.now().toString());
      image = { url: uploaded.secure_url, filename: uploaded.public_id };
    }

    const newListing = new Listing({
      ...req.body.listing,
      owner: req.user._id,
      image,
      geometry,
    });

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
  } catch (err) {
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url || "";
  if (originalImageUrl) originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250");

  res.render("./listings/edit.ejs", {
    listing,
    originalImageUrl,
    mapToken: process.env.MAP_TOKEN,
  });
};

module.exports.updateListing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found!");
      return res.redirect("/listings");
    }

    // Update fields
    Object.assign(listing, req.body.listing);

    // Update location if changed
    if (req.body.listing.location) {
      const geoData = await client.geocoding.forward(req.body.listing.location, {
        key: process.env.MAP_TOKEN,
        limit: 1,
      });
      listing.geometry = geoData.features[0].geometry;
    }

    // Update image if new file uploaded
    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, Date.now().toString());
      listing.image = { url: uploaded.secure_url, filename: uploaded.public_id };
    }

    await listing.save();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    next(err);
  }
};

module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
