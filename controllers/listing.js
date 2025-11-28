const Listing = require("../models/listing.js");
const client = require("@maptiler/client");
const { geocoding } = require("@maptiler/client");
client.config.apiKey = process.env.MAP_TOKEN;

module.exports.search = async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.redirect("/listings");
  }
  const regex = new RegExp(query, "i");
  const results = await Listing.find({ location: regex });
  res.render("./listings/searchResults.ejs", { results, query });

  console.log("Search query:", query);
  console.log("Results:", results);
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
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "review", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested it does not exist!");
    res.redirect("/listings");
  }
  res.render("./listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
  const result = await geocoding.forward(req.body.listing.location, {
    key: process.env.MAP_TOKEN,
    limit: 1,
  });

  const feature = result.features[0];
  const geometry = feature.geometry;

  let url = req.file.path;
  let filename = req.file.filename;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.geometry = geometry;

  await newListing.save();

  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested it does not exist!");
    res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_300,w_250");
  res.render("./listings/edit.ejs", {
    listing,
    originalImageUrl,
    mapToken: process.env.MAP_TOKEN,
  });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (req.body.listing.location) {
    const geoData = await client.geocoding.forward(req.body.listing.location);
    listing.geometry = {
      type: "Point",
      coordinates: geoData.features[0].geometry.coordinates,
    };
  }
  if (req.file) {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
  }
  await listing.save();

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
