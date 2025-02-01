"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("notifications", "membershipId", {
      type: Sequelize.UUID,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("notifications", "membershipId");
  },
};
